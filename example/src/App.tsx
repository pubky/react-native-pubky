import { StyleSheet, View, Button } from 'react-native';
import {
  auth,
  parseAuthUrl,
  publish,
  resolve,
} from '@synonymdev/react-native-pubky';

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title={'auth'}
        onPress={async (): Promise<void> => {
          try {
            const res = await auth(
              'pubkyauth:///?caps=/pub/pubky.app/:rw,/pub/foo.bar/file:r&secret=U55XnoH6vsMCpx1pxHtt8fReVg4Brvu9C0gUBuw-Jkw&relay=http://167.86.102.121:4173/',
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
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
            const res = await parseAuthUrl(
              'pubkyauth:///?relay=https://demo.httprelay.io/link&capabilities=/pub/pubky.app:rw,/pub/example.com/nested:rw&secret=FyzJ3gJ1W7boyFZC1Do9fYrRmDNgCLNRwEu_gaBgPUA'
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
        title={'publish'}
        onPress={async (): Promise<void> => {
          try {
            const res = await publish(
              'recordnametest',
              'recordcontenttest',
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
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
              'z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty'
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
