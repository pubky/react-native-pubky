import { StyleSheet, View, Button } from 'react-native';
import { auth } from 'react-native-pubky';

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title={'auth'}
        onPress={async (): Promise<void> => {
          try {
            const res = await auth('pubkyAuthUrl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
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
