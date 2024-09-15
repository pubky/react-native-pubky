import { StyleSheet, View, Button } from 'react-native';
import { auth } from '@synonymdev/react-native-pubky';
import { getAddress } from 'react-native-address-generator';


export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title={'getAddress'}
        onPress={async (): Promise<void> => {
          const mnemonic =
            'lazy rally chat way pet outside flame cup oval absurd innocent balcony';
          const passphrase = 'passphrase';
          const path = "m/84'/1'/0'/0/0";
          const network = 'testnet';

          const getAddressRes = await getAddress({
            mnemonic,
            path,
            network,
            passphrase,
          });
          if (getAddressRes.isErr()) {
            console.log(getAddressRes.error.message);
            return;
          }
          console.log(getAddressRes.value);
        }}
      />
      <Button
        title={'auth'}
        onPress={async (): Promise<void> => {
          try {
            const res = await auth(
              'pubkyAuthUrl',
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
