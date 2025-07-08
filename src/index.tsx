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

export async function setEventListener(
  callback: (eventData: string) => void
): Promise<Result<void>> {
  try {
    await Pubky.setEventListener();
    eventEmitter.addListener('PubkyEvent', callback);
    return ok(undefined);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function removeEventListener(): Promise<Result<void>> {
  try {
    //await Pubky.removeEventListener();
    eventEmitter.removeAllListeners('PubkyEvent');
    return ok(undefined);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function auth(
  url: string,
  secretKey: string
): Promise<Result<string[]>> {
  const res = await Pubky.auth(url, secretKey);
  if (res[0] === 'error') {
    return err(res[1]);
  }
  return ok(res[1]);
}

export type Capability = {
  path: string;
  permission: string;
};

export type PubkyAuthDetails = {
  relay: string;
  capabilities: Capability[];
  secret: string;
};

export async function parseAuthUrl(
  url: string
): Promise<Result<PubkyAuthDetails>> {
  try {
    const res = await Pubky.parseAuthUrl(url);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    const parsed = JSON.parse(res[1]);
    return ok(parsed);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function publish(
  recordName: string,
  recordContent: string,
  secretKey: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.publish(recordName, recordContent, secretKey);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
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
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
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
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function signUp(
  secretKey: string,
  homeserver: string,
  signupToken?: string
): Promise<Result<SessionInfo>> {
  try {
    const res = await Pubky.signUp(secretKey, homeserver, signupToken);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function republishHomeserver(
  secretKey: string,
  homeserver: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.republishHomeserver(secretKey, homeserver);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function signIn(secretKey: string): Promise<Result<SessionInfo>> {
  try {
    const res = await Pubky.signIn(secretKey);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function signOut(secretKey: string): Promise<Result<string[]>> {
  try {
    const res = await Pubky.signOut(secretKey);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function get(url: string): Promise<Result<string>> {
  try {
    const res = await Pubky.get(url);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    // Return the raw response directly
    // It will be either:
    // - Plain text (for UTF-8 content)
    // - "base64:..." (for binary content)
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function put(
  url: string,
  content: Object
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.put(url, JSON.stringify(content));
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function publishHttps(
  recordName: string,
  target: string,
  secretKey: string
): Promise<Result<string[]>> {
  try {
    const res = await Pubky.publishHttps(recordName, target, secretKey);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
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
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function list(url: string): Promise<Result<string[]>> {
  try {
    const res = await Pubky.list(url);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function deleteFile(url: string): Promise<Result<string[]>> {
  try {
    const res = await Pubky.deleteFile(url);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export interface SessionInfo {
  pubky: string;
  capabilities: string[];
}

export async function session(pubky: string): Promise<Result<SessionInfo>> {
  try {
    const res = await Pubky.session(pubky);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
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
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function getPublicKeyFromSecretKey(
  secretKey: string
): Promise<Result<IPublicKeyInfo>> {
  try {
    const res = await Pubky.getPublicKeyFromSecretKey(secretKey);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function createRecoveryFile(
  secretKey: string,
  passphrase: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.createRecoveryFile(secretKey, passphrase);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function decryptRecoveryFile(
  recoveryFile: string,
  passphrase: string
): Promise<Result<string>> {
  try {
    const res = await Pubky.decryptRecoveryFile(recoveryFile, passphrase);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function getHomeserver(pubky: string): Promise<Result<string>> {
  try {
    const res = await Pubky.getHomeserver(pubky);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function generateMnemonicPhrase(): Promise<Result<string>> {
  try {
    const res = await Pubky.generateMnemonicPhrase();
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1]);
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export interface IMnemonicKeypair extends IGenerateSecretKey {
  mnemonic?: string;
}

export async function mnemonicPhraseToKeypair(
  mnemonicPhrase: string
): Promise<Result<IMnemonicKeypair>> {
  try {
    const res = await Pubky.mnemonicPhraseToKeypair(mnemonicPhrase);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function generateMnemonicPhraseAndKeypair(): Promise<
  Result<IMnemonicKeypair>
> {
  try {
    const res = await Pubky.generateMnemonicPhraseAndKeypair();
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(JSON.parse(res[1]));
  } catch (e) {
    return err(JSON.stringify(e));
  }
}

export async function validateMnemonicPhrase(
  mnemonicPhrase: string
): Promise<Result<boolean>> {
  try {
    const res = await Pubky.validateMnemonicPhrase(mnemonicPhrase);
    if (res[0] === 'error') {
      return err(res[1]);
    }
    return ok(res[1] === 'true');
  } catch (e) {
    return err(JSON.stringify(e));
  }
}
