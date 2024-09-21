import { NativeModules, Platform } from 'react-native';
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

type Capability = {
  path: string;
  permission: string;
};

type PubkyAuthDetails = {
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

interface ITxt {
  cache_flush: boolean;
  class: string;
  name: string;
  rdata: {
    strings: string[];
    type: string;
  };
  ttl: number;
}
interface IDNSPacket {
  dns_packet: string;
  public_key: string;
  records: ITxt[];
  signature: string;
  timestamp: number;
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
