import { StyleSheet, View, Button } from 'react-native';
import { useEffect } from 'react';
import {
  auth,
  parseAuthUrl,
  publish,
  resolve,
  signUp,
  signIn,
  signOut,
  put,
  get,
  resolveHttps,
  publishHttps,
  list,
  generateSecretKey,
  getPublicKeyFromSecretKey,
  decryptRecoveryFile,
  createRecoveryFile,
  setEventListener,
  removeEventListener,
  session,
  deleteFile,
  getSignupToken,
  getHomeserver,
  generateMnemonicPhrase,
  mnemonicPhraseToKeypair,
  generateMnemonicPhraseAndKeypair,
  validateMnemonicPhrase,
} from '@synonymdev/react-native-pubky';

const HOMESERVER = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo';
//const HOMESERVER = 'ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy';
const SECRET_KEY =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const PUBLIC_KEY = 'z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty';

export default function App() {
  useEffect(() => {
    let cleanupListener: (() => void) | undefined;

    const setupEventListener = async () => {
      const result = await setEventListener((eventData) => {
        console.log('Received event:', eventData);
      });

      if (result.isOk()) {
        console.log('Event listener set up successfully');
      } else {
        console.error('Failed to set up event listener:', result.error);
      }

      cleanupListener = () => {
        removeEventListener();
      };
    };

    setupEventListener();

    // Cleanup function
    return () => {
      if (cleanupListener) {
        cleanupListener();
      }
    };
  }, []);
  return (
    <View style={styles.container}>
      <Button
        title={'auth'}
        onPress={async (): Promise<void> => {
          try {
            const res = await auth(
              'pubkyauth:///?caps=/pub/pubky.app/:rw,/pub/foo.bar/file:r&secret=U55XnoH6vsMCpx1pxHtt8fReVg4Brvu9C0gUBuw-Jkw&relay=http://167.86.102.121:4173/',
              SECRET_KEY
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'parseAuthUrl'}
        onPress={async (): Promise<void> => {
          try {
            const pubkyAuthUrl =
              'pubkyauth:///?relay=https://demo.httprelay.io/link&capabilities=/pub/pubky.app:rw,/pub/example.com/nested:rw&secret=FyzJ3gJ1W7boyFZC1Do9fYrRmDNgCLNRwEu_gaBgPUA';
            const res = await parseAuthUrl(pubkyAuthUrl);
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'publish'}
        onPress={async (): Promise<void> => {
          try {
            const res = await publish(
              'recordnametest', // Record Name
              'recordcontenttest', // Record Content
              SECRET_KEY // Secret Key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'resolve'}
        onPress={async (): Promise<void> => {
          try {
            const res = await resolve(
              PUBLIC_KEY // Public key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Get Signup Token'}
        onPress={async (): Promise<void> => {
          try {
            const res = await getSignupToken(
              HOMESERVER, // Homeserver pubky
              'admin_password' // Admin Password
            );
            if (res.isErr()) {
              console.log(res.error);
              return;
            }
            console.log('Signup Token:', res.value);
            // Store this token for use with signUpWithToken
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'signup'}
        onPress={async (): Promise<void> => {
          try {
            const signupToken = 'signup_token';
            const res = await signUp(
              SECRET_KEY, // Secret Key
              `pubky://${HOMESERVER}`, // Homeserver
              signupToken
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'signin'}
        onPress={async (): Promise<void> => {
          try {
            const res = await signIn(
              SECRET_KEY // Secret Key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'getHomeserver'}
        onPress={async (): Promise<void> => {
          try {
            const res = await getHomeserver(
              PUBLIC_KEY // Public key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'signout'}
        onPress={async (): Promise<void> => {
          try {
            const res = await signOut(
              SECRET_KEY // Secret Key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'put'}
        onPress={async (): Promise<void> => {
          try {
            const res = await put(`pubky://${PUBLIC_KEY}/pub/synonym.to`, {
              data: 'test data',
            });
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'get'}
        onPress={async (): Promise<void> => {
          try {
            const res = await get(`pubky://${PUBLIC_KEY}/pub/synonym.to`);
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'publishHttps'}
        onPress={async (): Promise<void> => {
          try {
            const res = await publishHttps(
              'example.com', // Record Name
              'target.example.com', // Target
              SECRET_KEY // Secret Key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'resolveHttps'}
        onPress={async (): Promise<void> => {
          try {
            const res = await resolveHttps(
              PUBLIC_KEY // Public key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'list'}
        onPress={async (): Promise<void> => {
          try {
            const res = await list(
              `pubky://${PUBLIC_KEY}/pub/synonym.to` // URL
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'deleteFile'}
        onPress={async (): Promise<void> => {
          try {
            const listRes = await list(
              `pubky://${PUBLIC_KEY}/pub/synonym.to` // URL
            );
            if (listRes.isErr()) {
              console.log(listRes.error.message);
              return;
            }
            if (!listRes.value.length || !listRes.value[0]) {
              console.log('No files found');
              return;
            }
            const res = await deleteFile(
              listRes.value[0] // URL
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'session'}
        onPress={async (): Promise<void> => {
          try {
            const res = await session(
              PUBLIC_KEY // Public key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
      <Button
        title={'generateSecretKey'}
        onPress={async (): Promise<void> => {
          try {
            const res = await generateSecretKey();
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log('Generated Secret Key:', res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'getPublicKeyFromSecretKey'}
        onPress={async (): Promise<void> => {
          try {
            const res = await getPublicKeyFromSecretKey(
              SECRET_KEY // Secret Key
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Create Recovery File'}
        onPress={async (): Promise<void> => {
          try {
            const res = await createRecoveryFile(
              SECRET_KEY, // Secret Key
              'passphrase' // Passphrase
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Decrypt Recovery File'}
        onPress={async (): Promise<void> => {
          try {
            const res = await decryptRecoveryFile(
              'cHVia3kub3JnL3JlY292ZXJ5CkZRt1NHIjxyTo0whSSgTgNrH56MPpGrSxvAQSE0x5FeklVJpNJqcNP4zjdwW/OpdBOsEC1qZ5MI/mcEUKFKVAEZwikdclsLZg==', // Recovery File (base64 encoded)
              'passphrase' // Passphrase
            );
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log(res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Generate Mnemonic Phrase'}
        onPress={async (): Promise<void> => {
          try {
            const res = await generateMnemonicPhrase();
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log('Generated mnemonic:', res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Mnemonic to Keypair'}
        onPress={async (): Promise<void> => {
          try {
            const testMnemonic =
              'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const res = await mnemonicPhraseToKeypair(testMnemonic);
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log('Keypair from mnemonic:', res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Generate Mnemonic and Keypair'}
        onPress={async (): Promise<void> => {
          try {
            const res = await generateMnemonicPhraseAndKeypair();
            if (res.isErr()) {
              console.log(res.error.message);
              return;
            }
            console.log('Generated mnemonic and keypair:', res.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />

      <Button
        title={'Validate Mnemonic Phrase'}
        onPress={async (): Promise<void> => {
          try {
            const validMnemonic =
              'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const invalidMnemonic = 'invalid invalid invalid';

            const res1 = await validateMnemonicPhrase(validMnemonic);
            const res2 = await validateMnemonicPhrase(invalidMnemonic);

            if (res1.isErr() || res2.isErr()) {
              console.log('Error validating mnemonic');
              return;
            }

            console.log('Valid mnemonic result:', res1.value);
            console.log('Invalid mnemonic result:', res2.value);
          } catch (e) {
            console.log(e);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
