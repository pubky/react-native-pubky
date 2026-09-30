type EventCallback = (value: unknown) => void;

jest.mock('react-native', () => {
  const listeners = new Map<string, Set<EventCallback>>();
  const pubky = {
    configureClient: jest.fn(async () => undefined),
    publicList: jest.fn(async () =>
      JSON.stringify({ entries: ['/pub/example'], nextCursor: 'next' })
    ),
    publicStats: jest.fn(async () =>
      JSON.stringify({ contentLength: '9007199254740993' })
    ),
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
  configureClient,
  publicList,
  publicStats,
  removeEventListener,
  startEventStream,
  switchNetwork,
} from '../index';

const native = NativeModules.Pubky as {
  configureClient: jest.Mock;
  publicList: jest.Mock;
  publicStats: jest.Mock;
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
    expect(result.error).toMatchObject({
      kind: 'server',
      operation: 'publicList',
      status: 503,
      message: 'Homeserver unavailable',
    });
  }
});

it('routes storage events to only the matching subscription', async () => {
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
  emit('PubkyStorageEvent', {
    subscriptionId: started.value.id,
    event: { eventType: 'PUT', resource: '/pub/example', cursor: '2' },
  });

  expect(onEvent).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledWith({
    eventType: 'PUT',
    resource: '/pub/example',
    cursor: '2',
  });
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
