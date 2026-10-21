type EventCallback = (value: unknown) => void;

jest.mock('react-native', () => {
  const listeners = new Map<string, Set<EventCallback>>();
  const pubky = {
    authWithCapabilities: jest.fn(async () => [
      'false',
      'Authorization success',
    ]),
    configureClient: jest.fn(async () => undefined),
    publicList: jest.fn(async () =>
      JSON.stringify({ entries: ['/pub/example'], nextCursor: 'next' })
    ),
    publicStats: jest.fn(async () =>
      JSON.stringify({ contentLength: '9007199254740993' })
    ),
    startGrantAuthFlowWithConfig: jest.fn(async () =>
      JSON.stringify({
        authorizationUrl: 'pubkyauth://signin_grant?...',
        clientKeySecret: 'Y2xpZW50LWtleQ==',
        approvalKeySecret: 'YXBwcm92YWwta2V5',
      })
    ),
    createCustomGrantProof: jest.fn(async () =>
      JSON.stringify({ grant: 'grant-token', proof: 'proof-token' })
    ),
    verifyCustomGrantProof: jest.fn(async () =>
      JSON.stringify({
        identity: 'identity',
        clientId: 'app.example',
        clientPublicKey: 'client-key',
        grantId: 'grant-id',
        capabilities: [{ path: '/pub/example/', permission: 'r' }],
        grantIssuedAt: '1',
        grantExpiresAt: '2',
        proofIssuedAt: '1',
        nonce: 'nonce',
        dataJson: JSON.stringify({ challenge: 'abc' }),
      })
    ),
    grantEncryptionKeyScopes: jest.fn(async () => ['/priv/example/']),
    deriveGrantEncryptionKey: jest.fn(async () => 'ZW5jcnlwdGlvbi1rZXk='),
    grantSignedApproval: jest.fn(async () => 'signed-approval'),
    removeEventListener: jest.fn(async () => undefined),
    startStorageEventStream: jest.fn(async () => undefined),
    stopStorageEventStream: jest.fn(async () => true),
    switchNetwork: jest.fn(async () => ['false', '']),
  };

  class NativeEventEmitter {
    addListener(name: string, callback: EventCallback) {
      const callbacks = listeners.get(name) ?? new Set<EventCallback>();
      callbacks.add(callback);
      listeners.set(name, callbacks);
      return { remove: () => callbacks.delete(callback) };
    }

    removeAllListeners(name: string) {
      listeners.delete(name);
    }
  }

  return {
    NativeEventEmitter,
    NativeModules: { Pubky: pubky },
    Platform: { select: (values: { default?: string }) => values.default },
    __emit: (name: string, value: unknown) =>
      listeners.get(name)?.forEach((callback) => callback(value)),
  };
});

import { NativeModules } from 'react-native';

import {
  PubkyError,
  type PubkyStorageEvent,
  authWithCapabilities,
  configureClient,
  createCustomGrantProof,
  deriveGrantEncryptionKey,
  grantEncryptionKeyScopes,
  grantSignedApproval,
  publicList,
  publicStats,
  removeEventListener,
  startGrantAuthFlowWithConfig,
  startEventStream,
  switchNetwork,
  verifyCustomGrantProof,
} from '../index';

const native = NativeModules.Pubky as {
  authWithCapabilities: jest.Mock;
  configureClient: jest.Mock;
  publicList: jest.Mock;
  publicStats: jest.Mock;
  startGrantAuthFlowWithConfig: jest.Mock;
  createCustomGrantProof: jest.Mock;
  verifyCustomGrantProof: jest.Mock;
  grantEncryptionKeyScopes: jest.Mock;
  deriveGrantEncryptionKey: jest.Mock;
  grantSignedApproval: jest.Mock;
  removeEventListener: jest.Mock;
  startStorageEventStream: jest.Mock;
  stopStorageEventStream: jest.Mock;
  switchNetwork: jest.Mock;
};

const emit = (name: string, value: unknown): void => {
  const reactNativeMock = jest.requireMock('react-native') as {
    __emit(eventName: string, eventValue: unknown): void;
  };
  reactNativeMock.__emit(name, value);
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('authorizes only the capabilities selected by the user', async () => {
  const result = await authWithCapabilities(
    'pubkyauth://signin_grant?caps=requested',
    'secret-key',
    '/pub/example/:r'
  );

  expect(result.isOk()).toBe(true);
  if (result.isOk()) expect(result.value).toBe('Authorization success');
  expect(native.authWithCapabilities).toHaveBeenCalledWith(
    'pubkyauth://signin_grant?caps=requested',
    'secret-key',
    '/pub/example/:r'
  );
});

it('serializes client configuration and switches networks', async () => {
  const configured = await configureClient({ requestTimeoutMs: 5_000 });
  expect(configured.isOk()).toBe(true);
  expect(native.configureClient).toHaveBeenCalledWith(
    JSON.stringify({ useTestnet: false, requestTimeoutMs: 5_000 })
  );

  const switched = await switchNetwork(true);
  expect(switched.isOk()).toBe(true);
  if (switched.isOk()) expect(switched.value).toEqual(['false', '']);
  expect(native.switchNetwork).toHaveBeenCalledWith(true);
});

it('parses list and metadata records without losing UInt64 precision', async () => {
  const listed = await publicList('pubky://user/pub/example', { limit: 10 });
  expect(listed.isOk()).toBe(true);
  if (listed.isOk()) {
    expect(listed.value).toEqual({
      entries: ['/pub/example'],
      nextCursor: 'next',
    });
  }

  const stats = await publicStats('pubky://user/pub/example');
  expect(stats.isOk()).toBe(true);
  if (stats.isOk()) {
    expect(stats.value?.contentLength).toBe('9007199254740993');
  }
});

it('decodes structured native failures into PubkyError', async () => {
  native.publicList.mockRejectedValueOnce(
    new Error(
      JSON.stringify({
        kind: 'server',
        operation: 'publicList',
        status: 503,
        message: 'Homeserver unavailable',
      })
    )
  );

  const result = await publicList('pubky://user/pub/example');
  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(PubkyError);
    if (!(result.error instanceof PubkyError)) return;
    expect(result.error.kind).toBe('server');
    expect(result.error.status).toBe(503);
    expect(result.error).toMatchObject({
      kind: 'server',
      operation: 'publicList',
      status: 503,
      message: 'Homeserver unavailable',
    });
  }
});

it('routes storage events with nullable hashes to only the matching subscription', async () => {
  const onEvent = jest.fn();
  const started = await startEventStream(
    { users: [{ publicKey: 'user' }] },
    { onEvent }
  );
  expect(started.isOk()).toBe(true);
  if (!started.isOk()) return;

  emit('PubkyStorageEvent', {
    subscriptionId: 'different-subscription',
    event: { eventType: 'PUT', resource: '/pub/ignored', cursor: '1' },
  });
  const deletion: PubkyStorageEvent = {
    eventType: 'DEL',
    resource: '/pub/example',
    cursor: '2',
    contentHash: null,
  };
  emit('PubkyStorageEvent', {
    subscriptionId: started.value.id,
    event: deletion,
  });

  expect(onEvent).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledWith(deletion);
  expect(native.startStorageEventStream).toHaveBeenCalledWith(
    JSON.stringify({
      paths: [],
      live: false,
      reverse: false,
      users: [{ publicKey: 'user' }],
    }),
    started.value.id
  );
});

it('removes the native legacy listener as well as JavaScript listeners', async () => {
  const result = await removeEventListener();
  expect(result.isOk()).toBe(true);
  expect(native.removeEventListener).toHaveBeenCalledTimes(1);
});

it('serializes signed Grant flow configuration and preserves resumable state', async () => {
  const result = await startGrantAuthFlowWithConfig({
    capabilities: '/priv/example/:re',
    clientId: 'app.example',
    approvalFormat: 'signedApprovalV1',
  });

  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(result.value.approvalKeySecret).toBe('YXBwcm92YWwta2V5');
  }
  expect(native.startGrantAuthFlowWithConfig).toHaveBeenCalledWith(
    JSON.stringify({
      capabilities: '/priv/example/:re',
      clientId: 'app.example',
      approvalFormat: 'signedApprovalV1',
    })
  );
});

it('bridges Pubky 0.16 Grant proof and encryption-key APIs', async () => {
  const created = await createCustomGrantProof('session', {
    challenge: 'abc',
  });
  expect(created.isOk()).toBe(true);
  expect(native.createCustomGrantProof).toHaveBeenCalledWith(
    'session',
    JSON.stringify({ challenge: 'abc' })
  );

  const verified = await verifyCustomGrantProof(
    { grant: 'grant-token', proof: 'proof-token' },
    45
  );
  expect(verified.isOk()).toBe(true);
  if (verified.isOk()) {
    expect(verified.value.data).toEqual({ challenge: 'abc' });
    expect(verified.value.grantExpiresAt).toBe('2');
  }
  expect(native.verifyCustomGrantProof).toHaveBeenCalledWith(
    JSON.stringify({ grant: 'grant-token', proof: 'proof-token' }),
    45
  );

  const scopes = await grantEncryptionKeyScopes('session');
  const key = await deriveGrantEncryptionKey('session', '/priv/example/a');
  const approval = await grantSignedApproval('session');
  expect(scopes.isOk() && scopes.value).toEqual(['/priv/example/']);
  expect(key.isOk() && key.value).toBe('ZW5jcnlwdGlvbi1rZXk=');
  expect(approval.isOk() && approval.value).toBe('signed-approval');
});
