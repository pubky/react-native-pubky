import { StyleSheet, View, Button } from 'react-native';
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
} from '@synonymdev/react-native-pubky';

const HOMESERVER = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo';
const SECRET_KEY =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const PUBLIC_KEY = 'z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty';

export default function App() {
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
        title={'signup'}
        onPress={async (): Promise<void> => {
          try {
            const res = await signUp(
              SECRET_KEY, // Secret Key
              `pubky://${HOMESERVER}` // Homeserver
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
