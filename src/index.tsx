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
    //await Pubky.removeEventListener();
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
  pubky: string;
  capabilities: string[];
  grant_secret: string;
}

export interface CookieSessionInfo {
  pubky: string;
  capabilities: string[];
  session_secret: string;
}

export type SessionInfo = GrantSessionInfo;

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
