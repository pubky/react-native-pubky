import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { ok, err, type Result } from '@synonymdev/result';

const LINKING_ERROR =
  `The package 'react-native-pubky' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const Pubky = NativeModules.Pubky
  ? NativeModules.Pubky
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = new NativeEventEmitter(Pubky);

const nativeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const nativeResultError = (res: unknown): string | null => {
  if (!Array.isArray(res)) return null;

  const isError = String(res[0] ?? '').toLowerCase();
  const payload =
    typeof res[1] === 'string' ? res[1] : nativeErrorMessage(res[1]);

  if (isError === 'true') return payload;
  return null;
};

const optionalString = (value: string | undefined): string | undefined =>
  value === '' ? undefined : value;

export type PubkyErrorKind =
  | 'transport'
  | 'server'
  | 'validation'
  | 'decodeJson'
  | 'pkarr'
  | 'parse'
  | 'authentication'
  | 'build'
  | 'state'
  | 'unknown';

export class PubkyError extends Error {
  readonly kind: PubkyErrorKind;
  readonly operation?: string;
  readonly status?: number;
  readonly retryable?: boolean;
  readonly expired?: boolean;
  readonly nativeCode?: string;

  constructor(
    message: string,
    details: {
      kind?: PubkyErrorKind;
      operation?: string;
      status?: number;
      retryable?: boolean;
      expired?: boolean;
      nativeCode?: string;
    } = {}
  ) {
    super(message);
    this.name = 'PubkyError';
    this.kind = details.kind ?? 'unknown';
    this.operation = details.operation;
    this.status = details.status;
    this.retryable = details.retryable;
    this.expired = details.expired;
    this.nativeCode = details.nativeCode;
  }
}

const nativePubkyError = (error: unknown, operation: string): PubkyError => {
  const nativeCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : undefined;
  const rawMessage = nativeErrorMessage(error);
  const jsonStart = rawMessage.indexOf('{');

  if (jsonStart >= 0) {
    try {
      const details = JSON.parse(rawMessage.slice(jsonStart)) as {
        kind?: PubkyErrorKind;
        operation?: string;
        message?: string;
        status?: number;
        retryable?: boolean;
        expired?: boolean;
      };
      return new PubkyError(details.message ?? rawMessage, {
        ...details,
        operation: details.operation ?? operation,
        nativeCode,
      });
    } catch {
      // Fall through to the native message if the bridge did not carry JSON.
    }
  }

  return new PubkyError(rawMessage, { operation, nativeCode });
};

const typedResult = async <T,>(
  operation: string,
  call: () => Promise<T>
): Promise<Result<T>> => {
  try {
    return ok(await call());
  } catch (error) {
    return err(nativePubkyError(error, operation));
  }
};

export async function setEventListener(
  callback: (eventData: string) => void
): Promise<Result<void>> {
  try {
    await Pubky.setEventListener();
    eventEmitter.addListener('PubkyEvent', (...args: readonly Object[]) => {
      const eventData = args[0] as unknown;
      callback(
        typeof eventData === 'string'
          ? eventData
          : nativeErrorMessage(eventData)
      );
    });
    return ok(undefined);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function removeEventListener(): Promise<Result<void>> {
  try {
    await Pubky.removeEventListener();
    eventEmitter.removeAllListeners('PubkyEvent');
    return ok(undefined);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function auth(
  url: string,
  secretKey: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.auth(url, secretKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export type Capability = {
  path: string;
  permission: string;
};

export type PubkyAuthDetails = {
  relay: string;
  capabilities: Capability[];
  secret: string;
  /**
   * Auth intent parsed from the deep link host.
   * Legacy `pubkyauth:///?...` URLs parse as "signin". Absent only when
   * running against a pre-0.9.1 native binary.
   */
  kind?: 'signin' | 'signup' | 'signin_grant' | 'signup_grant';
  /** Homeserver public key (bare z-base32) from the `hs` param of signup links. */
  homeserver?: string;
  /** Signup token from the `st` param of signup links. */
  signup_token?: string;
  /** Grant client id from the `cid` param of grant auth links. */
  client_id?: string;
  /** Grant client public key from the `cpk` param of grant auth links. */
  client_public_key?: string;
  /** x-callback-url source app name. */
  x_source?: string;
  /** x-callback-url success callback. */
  x_success?: string;
  /** x-callback-url error callback. */
  x_error?: string;
  /** x-callback-url cancel callback. */
  x_cancel?: string;
};

export type PubkyDeepLinkDetails = {
  scheme: 'pubkyauth' | 'pubkyring';
  kind:
    | 'signin'
    | 'signup'
    | 'direct_signup'
    | 'signin_grant'
    | 'signup_grant'
    | 'secret_export';
  url: string;
  relay?: string;
  capabilities?: Capability[];
  secret?: string;
  homeserver?: string;
  signup_token?: string;
  client_id?: string;
  client_public_key?: string;
  x_source?: string;
  x_success?: string;
  x_error?: string;
  x_cancel?: string;
};

export async function parseAuthUrl(
  url: string
): Promise<Result<PubkyAuthDetails>> {
  try {
    const res = await Pubky.parseAuthUrl(url);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    const parsed = JSON.parse(res[1]);
    return ok(parsed);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function parseDeepLink(
  url: string
): Promise<Result<PubkyDeepLinkDetails>> {
  try {
    const res = await Pubky.parseDeepLink(url);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    const parsed = JSON.parse(res[1]);
    return ok(parsed);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function publish(
  recordName: string,
  recordContent: string,
  secretKey: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.publish(recordName, recordContent, secretKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export interface ITxt {
  cache_flush: boolean;
  class: string;
  name: string;
  rdata: {
    strings: string[];
    type: string;
  };
  ttl: number;
}
export interface IDNSPacket {
  signed_packet: string;
  public_key: string;
  signature: string;
  timestamp: number;
  last_seen: number;
  dns_packet: string;
  records: ITxt[];
}
export async function resolve(publicKey: string): Promise<Result<IDNSPacket>> {
  try {
    const res = await Pubky.resolve(publicKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

/*
Returns the signupToken used in signUp
 */
export async function getSignupToken(
  homeserverPubky: string,
  adminPassword: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.getSignupToken(homeserverPubky, adminPassword);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function signUp(
  secretKey: string,
  homeserver: string,
  signupToken: string | undefined,
  clientId: string
): Promise<Result<SessionInfo>> {
  return signUpGrant(secretKey, homeserver, signupToken, clientId);
}

export async function signUpGrant(
  secretKey: string,
  homeserver: string,
  signupToken: string | undefined,
  clientId: string
): Promise<Result<GrantSessionInfo>> {
  try {
    const res = await Pubky.signUpGrant(
      secretKey,
      homeserver,
      optionalString(signupToken),
      clientId
    );
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function signUpCookie(
  secretKey: string,
  homeserver: string,
  signupToken: string | undefined
): Promise<Result<CookieSessionInfo>> {
  try {
    const res = await Pubky.signUpCookie(
      secretKey,
      homeserver,
      optionalString(signupToken)
    );
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function republishHomeserver(
  secretKey: string,
  homeserver: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.republishHomeserver(secretKey, homeserver);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function signIn(
  secretKey: string,
  clientId: string
): Promise<Result<SessionInfo>> {
  return signInGrant(secretKey, clientId);
}

export async function signInGrant(
  secretKey: string,
  clientId: string
): Promise<Result<GrantSessionInfo>> {
  try {
    const res = await Pubky.signInGrant(secretKey, clientId);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function signInCookie(
  secretKey: string
): Promise<Result<CookieSessionInfo>> {
  try {
    const res = await Pubky.signInCookie(secretKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function signOut(sessionSecret: string): Promise<Result<string>> {
  try {
    const res = await Pubky.signOut(sessionSecret);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function listGrants(
  sessionSecret: string
): Promise<Result<GrantInfo[]>> {
  try {
    const res = await Pubky.listGrants(sessionSecret);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function revokeGrant(
  sessionSecret: string,
  grantId: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.revokeGrant(sessionSecret, grantId);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function revalidateSession(
  sessionSecret: string
): Promise<Result<SessionInfo | CookieSessionInfo>> {
  try {
    const res = await Pubky.revalidateSession(sessionSecret);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function get(url: string): Promise<Result<string>> {
  try {
    const res = await Pubky.get(url);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    // Return the raw response directly
    // It will be either:
    // - Plain text (for UTF-8 content)
    // - "base64:..." (for binary content)
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function put(
  url: string,
  content: Object,
  secretKey: string,
  clientId: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.put(
      url,
      JSON.stringify(content),
      secretKey,
      clientId
    );
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function publishHttps(
  recordName: string,
  target: string,
  secretKey: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.publishHttps(recordName, target, secretKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export interface IHttpsRecord {
  name: string;
  class: string;
  ttl: number;
  priority: number;
  target: string;
  port?: number;
  alpn?: string[];
}

export interface IHttpsResolveResult {
  public_key: string;
  https_records: IHttpsRecord[];
}

export async function resolveHttps(
  publicKey: string
): Promise<Result<IHttpsResolveResult>> {
  try {
    const res = await Pubky.resolveHttps(publicKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function list(url: string): Promise<Result<string[]>> {
  try {
    const res = await Pubky.list(url);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function deleteFile(
  url: string,
  secretKey: string,
  clientId: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.deleteFile(url, secretKey, clientId);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export interface GrantSessionInfo {
  homeserver: string;
  pubky: string;
  client_id: string;
  capabilities: string[];
  grant_id: string;
  token_expires_at: number;
  grant_expires_at: number;
  created_at: number;
  grant_secret: string;
}

export interface CookieSessionInfo {
  pubky: string;
  capabilities: string[];
  session_secret: string;
}

export type SessionInfo = GrantSessionInfo;

export interface GrantInfo {
  grant_id: string;
  client_id: string;
  capabilities: string;
  issued_at: number;
  expires_at: number;
}

export interface IPublicKeyInfo {
  public_key: string;
  uri: string;
}
export interface IGenerateSecretKey extends IPublicKeyInfo {
  secret_key: string;
}
export async function generateSecretKey(): Promise<Result<IGenerateSecretKey>> {
  try {
    const res = await Pubky.generateSecretKey();
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function getPublicKeyFromSecretKey(
  secretKey: string
): Promise<Result<IPublicKeyInfo>> {
  try {
    const res = await Pubky.getPublicKeyFromSecretKey(secretKey);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function createRecoveryFile(
  secretKey: string,
  passphrase: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.createRecoveryFile(secretKey, passphrase);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function decryptRecoveryFile(
  recoveryFile: string,
  passphrase: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.decryptRecoveryFile(recoveryFile, passphrase);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function getHomeserver(pubky: string): Promise<Result<string>> {
  try {
    const res = await Pubky.getHomeserver(pubky);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function generateMnemonicPhrase(): Promise<Result<string>> {
  try {
    const res = await Pubky.generateMnemonicPhrase();
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export interface IMnemonicKeypair extends IGenerateSecretKey {
  mnemonic: string;
}

export async function mnemonicPhraseToKeypair(
  mnemonicPhrase: string
): Promise<Result<IGenerateSecretKey>> {
  try {
    const res = await Pubky.mnemonicPhraseToKeypair(mnemonicPhrase);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function generateMnemonicPhraseAndKeypair(): Promise<
  Result<IMnemonicKeypair>
> {
  try {
    const res = await Pubky.generateMnemonicPhraseAndKeypair();
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function validateMnemonicPhrase(
  mnemonicPhrase: string
): Promise<Result<boolean>> {
  try {
    const res = await Pubky.validateMnemonicPhrase(mnemonicPhrase);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1] === 'true');
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function startAuthFlow(
  capabilities: string,
  clientId: string
): Promise<Result<string>> {
  return startGrantAuthFlow(capabilities, clientId);
}

export async function startGrantAuthFlow(
  capabilities: string,
  clientId: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.startGrantAuthFlow(capabilities, clientId);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function awaitAuthApproval(): Promise<Result<SessionInfo>> {
  return awaitGrantAuthApproval();
}

export async function awaitGrantAuthApproval(): Promise<
  Result<GrantSessionInfo>
> {
  try {
    const res = await Pubky.awaitGrantAuthApproval();
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function startCookieAuthFlow(
  capabilities: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.startCookieAuthFlow(capabilities);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function awaitCookieAuthApproval(): Promise<
  Result<CookieSessionInfo>
> {
  try {
    const res = await Pubky.awaitCookieAuthApproval();
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function putWithSession(
  url: string,
  content: string,
  sessionSecret: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.putWithSession(url, content, sessionSecret);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

export async function deleteWithSession(
  url: string,
  sessionSecret: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.deleteWithSession(url, sessionSecret);
    const errorMessage = nativeResultError(res);
    if (errorMessage) {
      return err(errorMessage);
    }
    return ok(res[1]);
  } catch (e) {
    return err(nativeErrorMessage(e));
  }
}

/** Raw bytes cross the React Native bridge as standard padded base64. */
export type Base64Data = string;
/** UInt64 values are returned as decimal strings to avoid JavaScript precision loss. */
export type UInt64String = string;

export interface PubkyClientConfig {
  useTestnet?: boolean;
  testnetHost?: string;
  requestTimeoutMs?: number;
  readTimeoutMs?: number;
  poolMaxIdlePerHost?: number;
  maxErrorBodyBytes?: number;
  userAgentExtra?: string;
}

export interface StorageListOptions {
  reverse?: boolean;
  shallow?: boolean;
  limit?: number;
  cursor?: string;
}

export interface StorageListPage {
  entries: string[];
  nextCursor?: string;
}

export interface StorageResourceStats {
  contentLength?: UInt64String;
  contentType?: string;
  lastModifiedMs?: UInt64String;
  etag?: string;
}

export interface GrantAuthFlowConfig {
  capabilities: string;
  clientId: string;
  /** Presence selects signup; absence selects signin. */
  homeserver?: string;
  signupToken?: string;
  relay?: string;
  /** Exactly 32 bytes encoded as base64. */
  clientSecret?: Base64Data;
  /** Exactly 32 bytes encoded as base64. */
  clientKeySecret?: Base64Data;
  xSource?: string;
  xSuccess?: string;
  xError?: string;
  xCancel?: string;
}

export interface GrantAuthFlowState {
  authorizationUrl: string;
  /** Sensitive proof-of-possession key material encoded as base64. */
  clientKeySecret: Base64Data;
}

export interface EventStreamUser {
  publicKey: string;
  cursor?: UInt64String | number;
}

export interface EventStreamConfig {
  users: EventStreamUser[];
  homeserver?: string;
  paths?: string[];
  limit?: number;
  maxEventBytes?: number;
  live?: boolean;
  reverse?: boolean;
  /** Required when any path selects `/priv/...`. */
  sessionSecret?: string;
}

export interface PubkyStorageEvent {
  eventType: 'PUT' | 'DEL' | string;
  resource: string;
  cursor: UInt64String;
  contentHash?: string;
}

export interface StorageLockInfo {
  id: string;
  path: string;
  token: string;
  timeoutSeconds: UInt64String;
}

const parseNativeJson = <T,>(value: string): T => JSON.parse(value) as T;

export async function configureClient(
  config: PubkyClientConfig
): Promise<Result<void>> {
  return typedResult('configureClient', async () => {
    await Pubky.configureClient(
      JSON.stringify({ useTestnet: false, ...config })
    );
  });
}

/**
 * Rebuild the shared native client for the selected Pubky network.
 * Prefer `configureClient` when timeout or transport settings are also needed.
 */
export async function switchNetwork(
  useTestnet: boolean
): Promise<Result<string[]>> {
  return typedResult('switchNetwork', () => Pubky.switchNetwork(useTestnet));
}

export async function publicGetBytes(
  address: string
): Promise<Result<Base64Data>> {
  return typedResult('publicGetBytes', () => Pubky.publicGetBytes(address));
}

export async function publicExists(address: string): Promise<Result<boolean>> {
  return typedResult('publicExists', () => Pubky.publicExists(address));
}

export async function publicStats(
  address: string
): Promise<Result<StorageResourceStats | null>> {
  return typedResult('publicStats', async () => {
    const value = await Pubky.publicStats(address);
    return value == null ? null : parseNativeJson<StorageResourceStats>(value);
  });
}

export async function publicList(
  address: string,
  options: StorageListOptions = {}
): Promise<Result<StorageListPage>> {
  return typedResult('publicList', async () =>
    parseNativeJson<StorageListPage>(
      await Pubky.publicList(address, JSON.stringify(options))
    )
  );
}

export async function sessionGetBytes(
  pathOrAddress: string,
  sessionSecret: string
): Promise<Result<Base64Data>> {
  return typedResult('sessionGetBytes', () =>
    Pubky.sessionGetBytes(pathOrAddress, sessionSecret)
  );
}

export async function sessionExists(
  pathOrAddress: string,
  sessionSecret: string
): Promise<Result<boolean>> {
  return typedResult('sessionExists', () =>
    Pubky.sessionExists(pathOrAddress, sessionSecret)
  );
}

export async function sessionStats(
  pathOrAddress: string,
  sessionSecret: string
): Promise<Result<StorageResourceStats | null>> {
  return typedResult('sessionStats', async () => {
    const value = await Pubky.sessionStats(pathOrAddress, sessionSecret);
    return value == null ? null : parseNativeJson<StorageResourceStats>(value);
  });
}

export async function sessionList(
  pathOrAddress: string,
  sessionSecret: string,
  options: StorageListOptions = {}
): Promise<Result<StorageListPage>> {
  return typedResult('sessionList', async () =>
    parseNativeJson<StorageListPage>(
      await Pubky.sessionList(
        pathOrAddress,
        sessionSecret,
        JSON.stringify(options)
      )
    )
  );
}

export async function sessionPutBytes(
  pathOrAddress: string,
  content: Base64Data,
  sessionSecret: string
): Promise<Result<void>> {
  return typedResult('sessionPutBytes', async () => {
    await Pubky.sessionPutBytes(pathOrAddress, content, sessionSecret);
  });
}

export async function sessionDelete(
  pathOrAddress: string,
  sessionSecret: string
): Promise<Result<void>> {
  return typedResult('sessionDelete', async () => {
    await Pubky.sessionDelete(pathOrAddress, sessionSecret);
  });
}

export async function startGrantAuthFlowWithConfig(
  config: GrantAuthFlowConfig
): Promise<Result<GrantAuthFlowState>> {
  return typedResult('startGrantAuthFlowWithConfig', async () =>
    parseNativeJson<GrantAuthFlowState>(
      await Pubky.startGrantAuthFlowWithConfig(JSON.stringify(config))
    )
  );
}

export async function saveGrantAuthFlow(): Promise<Result<GrantAuthFlowState>> {
  return typedResult('saveGrantAuthFlow', async () =>
    parseNativeJson<GrantAuthFlowState>(await Pubky.saveGrantAuthFlow())
  );
}

export async function restoreGrantAuthFlow(
  state: GrantAuthFlowState
): Promise<Result<string>> {
  return typedResult('restoreGrantAuthFlow', () =>
    Pubky.restoreGrantAuthFlow(JSON.stringify(state))
  );
}

export async function pollGrantAuthFlow(): Promise<
  Result<GrantSessionInfo | null>
> {
  return typedResult('pollGrantAuthFlow', async () => {
    const value = await Pubky.pollGrantAuthFlow();
    return value == null ? null : parseNativeJson<GrantSessionInfo>(value);
  });
}

export async function awaitGrantAuthFlow(): Promise<Result<GrantSessionInfo>> {
  return typedResult('awaitGrantAuthFlow', async () =>
    parseNativeJson<GrantSessionInfo>(await Pubky.awaitGrantAuthFlow())
  );
}

export async function cancelGrantAuthFlow(): Promise<Result<void>> {
  return typedResult('cancelGrantAuthFlow', async () => {
    await Pubky.cancelGrantAuthFlow();
  });
}

export async function signInGrantBlocking(
  secretKey: string,
  clientId: string
): Promise<Result<GrantSessionInfo>> {
  return typedResult('signInGrantBlocking', async () =>
    parseNativeJson<GrantSessionInfo>(
      await Pubky.signInGrantBlocking(secretKey, clientId)
    )
  );
}

export async function signInCookieBlocking(
  secretKey: string
): Promise<Result<CookieSessionInfo>> {
  return typedResult('signInCookieBlocking', async () =>
    parseNativeJson<CookieSessionInfo>(
      await Pubky.signInCookieBlocking(secretKey)
    )
  );
}

type NativeEventSubscription = { remove(): void };

const storageEventSubscriptions = new Map<string, NativeEventSubscription[]>();
let storageEventSequence = 0;

const removeLocalStorageEventSubscription = (subscriptionId: string): void => {
  storageEventSubscriptions
    .get(subscriptionId)
    ?.forEach((item) => item.remove());
  storageEventSubscriptions.delete(subscriptionId);
};

export interface EventStreamCallbacks {
  onEvent(event: PubkyStorageEvent): void;
  onError?(error: PubkyError): void;
  onComplete?(): void;
}

export interface EventStreamSubscription {
  id: string;
  remove(): Promise<Result<boolean>>;
}

export async function startEventStream(
  config: EventStreamConfig,
  callbacks: EventStreamCallbacks
): Promise<Result<EventStreamSubscription>> {
  const subscriptionId = `pubky-storage-${Date.now()}-${++storageEventSequence}`;

  const subscriptions: NativeEventSubscription[] = [
    eventEmitter.addListener(
      'PubkyStorageEvent',
      (body: { subscriptionId?: string; event?: PubkyStorageEvent }) => {
        if (body.subscriptionId === subscriptionId && body.event) {
          callbacks.onEvent(body.event);
        }
      }
    ),
    eventEmitter.addListener(
      'PubkyStorageEventError',
      (body: { subscriptionId?: string; message?: string }) => {
        if (body.subscriptionId !== subscriptionId) return;
        removeLocalStorageEventSubscription(subscriptionId);
        callbacks.onError?.(
          new PubkyError(body.message ?? 'Event stream failed', {
            kind: 'transport',
            operation: 'startEventStream',
          })
        );
        Pubky.stopStorageEventStream(subscriptionId).catch(() => undefined);
      }
    ),
    eventEmitter.addListener(
      'PubkyStorageEventComplete',
      (body: { subscriptionId?: string }) => {
        if (body.subscriptionId !== subscriptionId) return;
        removeLocalStorageEventSubscription(subscriptionId);
        callbacks.onComplete?.();
        Pubky.stopStorageEventStream(subscriptionId).catch(() => undefined);
      }
    ),
  ];
  storageEventSubscriptions.set(subscriptionId, subscriptions);

  const started = await typedResult('startEventStream', async () => {
    await Pubky.startStorageEventStream(
      JSON.stringify({ paths: [], live: false, reverse: false, ...config }),
      subscriptionId
    );
    return {
      id: subscriptionId,
      remove: () => stopEventStream(subscriptionId),
    };
  });

  if (started.isErr()) {
    removeLocalStorageEventSubscription(subscriptionId);
  }
  return started;
}

export async function stopEventStream(
  subscriptionId: string
): Promise<Result<boolean>> {
  removeLocalStorageEventSubscription(subscriptionId);
  return typedResult('stopEventStream', () =>
    Pubky.stopStorageEventStream(subscriptionId)
  );
}

export async function stopAllEventStreams(): Promise<Result<UInt64String>> {
  [...storageEventSubscriptions.keys()].forEach(
    removeLocalStorageEventSubscription
  );
  return typedResult('stopAllEventStreams', () =>
    Pubky.stopAllStorageEventStreams()
  );
}

export async function acquireStorageLock(
  pathOrAddress: string,
  sessionSecret: string,
  timeoutSeconds: number
): Promise<Result<StorageLockInfo>> {
  return typedResult('acquireStorageLock', async () =>
    parseNativeJson<StorageLockInfo>(
      await Pubky.acquireStorageLock(
        pathOrAddress,
        sessionSecret,
        timeoutSeconds
      )
    )
  );
}

export async function refreshStorageLock(
  lockId: string,
  timeoutSeconds: number
): Promise<Result<StorageLockInfo>> {
  return typedResult('refreshStorageLock', async () =>
    parseNativeJson<StorageLockInfo>(
      await Pubky.refreshStorageLock(lockId, timeoutSeconds)
    )
  );
}

export async function putWithStorageLock(
  lockId: string,
  content: Base64Data
): Promise<Result<void>> {
  return typedResult('putWithStorageLock', async () => {
    await Pubky.putWithStorageLock(lockId, content);
  });
}

export async function deleteWithStorageLock(
  lockId: string
): Promise<Result<void>> {
  return typedResult('deleteWithStorageLock', async () => {
    await Pubky.deleteWithStorageLock(lockId);
  });
}

export async function releaseStorageLock(
  lockId: string
): Promise<Result<void>> {
  return typedResult('releaseStorageLock', async () => {
    await Pubky.releaseStorageLock(lockId);
  });
}
