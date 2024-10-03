# react-native-pubky

React Native implementation of [pubky](https://github.com/pubky/pubky)

## Installation

```sh
npm install @synonymdev/react-native-pubky
```

## Implementation Status
### Implemented Methods
- [x] [auth](#auth): Authentication functionality.
- [x] [parseAuthUrl](#parseAuthUrl): Method to decode an authUrl.
- [x] [publish](#publish): Functionality to publish content.
- [x] [resolve](#resolve): Functionality to resolve content.
- [x] [publishHttps](#publishHttps): Publish HTTPS records.
- [x] [resolveHttps](#resolveHttps): Resolve HTTPS records.
- [x] [signUp](#signUp): Sign-up to a homeserver and update Pkarr accordingly.
- [x] [signIn](#signIn): Sign-in to a homeserver.
- [x] [signOut](#signOut): Sign-out from a homeserver.
- [x] [put](#put): Upload a small payload to a given path.
- [x] [get](#get): Download a small payload from a given path relative to a pubky author.
- [x] [list](#list): Returns a list of Pubky URLs of the files in the path of the `url` provided.
- [x] [generateSecretKey](#generateSecretKey): Generate a secret key.
- [x] [getPublicKeyFromSecretKey](#getPublicKeyFromSecretKey): Get the public key string and uri from a secret key.
- [x] [create_recovery_file](#createRecoveryFile): Create a recovery file.
- [x] [decrypt_recovery_file](#decryptRecoveryFile): Decrypt a recovery file.
- 
### Methods to be Implemented
- [ ] getProfile: Retrieve the profile of a user.
- [ ] editProfile: Submit changes to the specified profile.


## Usage
### <a name="auth"></a>Auth
```js
import { auth } from '@synonymdev/react-native-pubky';

const authRes = await auth(
  'pubkyauth:///?caps=/pub/pubky.app/:rw,/pub/foo.bar/file:r&secret=U55XnoH6vsMCpx1pxHtt8fReVg4Brvu9C0gUBuw-Jkw&relay=http://167.86.102.121:4173/',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);
if (authRes.isErr()) {
  console.log(authRes.error.message);
  return;
}
console.log(authRes.value);
```
### <a name="parseAuthUrl"></a>parseAuthUrl
```js
import { parseAuthUrl } from '@synonymdev/react-native-pubky';

const pubkyAuthUrl = 'pubkyauth:///?relay=https://demo.httprelay.io/link&capabilities=/pub/pubky.app:rw,/pub/example.com/nested:rw&secret=FyzJ3gJ1W7boyFZC1Do9fYrRmDNgCLNRwEu_gaBgPUA';
const parseRes = await parseAuthUrl(pubkyAuthUrl);
if (parseRes.isErr()) {
  console.log(parseRes.error.message);
  return;
}
console.log(parseRes.value);
```
### <a name="publish"></a>publish
```js
import { publish } from '@synonymdev/react-native-pubky';

const publishRes = await publish(
  'recordnametest',
  'recordcontenttest',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);
if (publishRes.isErr()) {
  console.log(publishRes.error.message);
  return;
}
console.log(publishRes.value);
```
### <a name="resolve"></a>resolve
```js
import { resolve } from '@synonymdev/react-native-pubky';

const resolveRes = await resolve(
  'z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty'
);
if (resolveRes.isErr()) {
  console.log(resolveRes.error.message);
  return;
}
console.log(resolveRes.value);
```

### <a name="publishHttps"></a>publishHttps
```js
import { publishHttps } from '@synonymdev/react-native-pubky';

const publishHttpsRes = await publishHttps(
  'example.com', // Record Name
  'target.example.com', // Target
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // Secret Key
);
if (publishHttpsRes.isErr()) {
  console.log(publishHttpsRes.error.message);
  return;
}
console.log(publishHttpsRes.value);
```

### <a name="resolveHttps"></a>resolveHttps
```js
import { resolveHttps } from '@synonymdev/react-native-pubky';

const resolveHttpsRes = await resolveHttps(
  'z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty' // Public key
);
if (resolveHttpsRes.isErr()) {
  console.log(resolveHttpsRes.error.message);
  return;
}
console.log(resolveHttpsRes.value);
```

### <a name="put"></a>put
```js
import { put } from '@synonymdev/react-native-pubky';

const putRes = await put(
  'pubky://z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty/pub/synonym.to', // URL
  { data: 'test content' }, // Content
);
if (putRes.isErr()) {
  console.log(putRes.error.message);
  return;
}
console.log(putRes.value);
```

### <a name="get"></a>get
```js
import { get } from '@synonymdev/react-native-pubky';

const getRes = await get(
  'pubky://z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty/pub/synonym.to' // URL
);
if (getRes.isErr()) {
  console.log(getRes.error.message);
  return;
}
console.log(getRes.value);
```

### <a name="list"></a>list
```js
import { list } from '@synonymdev/react-native-pubky';

const listRes = await list(
  'pubky://z4e8s17cou9qmuwen8p1556jzhf1wktmzo6ijsfnri9c4hnrdfty/pub/' // URL
);
if (listRes.isErr()) {
  console.log(listRes.error.message);
  return;
}
console.log(listRes.value);
```

### <a name="generateSecretKey"></a>generateSecretKey
```js
import { generateSecretKey } from '@synonymdev/react-native-pubky';

const generateSecretKeyRes = await generateSecretKey();
if (generateSecretKeyRes.isErr()) {
  console.log(generateSecretKeyRes.error.message);
  return;
}
console.log(generateSecretKeyRes.value);
```

### <a name="getPublicKeyFromSecretKey"></a>getPublicKeyFromSecretKey
```js
import { getPublicKeyFromSecretKey } from '@synonymdev/react-native-pubky';

const getPublicKeyFromSecretKeyRes = await getPublicKeyFromSecretKey('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
if (getPublicKeyFromSecretKeyRes.isErr()) {
  console.log(getPublicKeyFromSecretKeyRes.error.message);
  return;
}
console.log(getPublicKeyFromSecretKeyRes.value);
```

### <a name="signUp"></a>signUp
```js
import { signUp } from '@synonymdev/react-native-pubky';

const signUpRes = await signUp(
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Secret
  'pubky://8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo', // Homeserver
);
if (signUpRes.isErr()) {
  console.log(signUpRes.error.message);
  return;
}
console.log(signUpRes.value);
```

### <a name="signIn"></a>signIn
```js
import { signIn } from '@synonymdev/react-native-pubky';

const signInRes = await signIn(
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // Secret Key
);
if (signInRes.isErr()) {
  console.log(signInRes.error.message);
  return;
}
console.log(signInRes.value);
```

### <a name="signOut"></a>signIn
```js
import { signOut } from '@synonymdev/react-native-pubky';

const signOutRes = await signOut(
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // Secret Key
);
if (signOutRes.isErr()) {
  console.log(signOutRes.error.message);
  return;
}
console.log(signOutRes.value);
```

### <a name="createRecoveryFile"></a>createRecoveryFile
```js
import { createRecoveryFile } from '@synonymdev/react-native-pubky';

const createRecoveryFileRes = await createRecoveryFile(
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Secret Key
  'passphrase', // Passphrase
);
if (createRecoveryFileRes.isErr()) {
  console.log(createRecoveryFileRes.error.message);
  return;
}
console.log(createRecoveryFileRes.value);
```

### <a name="decryptRecoveryFile"></a>decryptRecoveryFile
```js
import { decryptRecoveryFile } from '@synonymdev/react-native-pubky';

const decryptRecoveryFileRes = await decryptRecoveryFile(
  'cHVia3kub3JnL3JlY292ZXJ5CkZRt1NHIjxyTo0whSSgTgNrH56MPpGrSxvAQSE0x5FeklVJpNJqcNP4zjdwW/OpdBOsEC1qZ5MI/mcEUKFKVAEZwikdclsLZg==', // Recovery File
  'passphrase', // Passphrase
);
if (decryptRecoveryFileRes.isErr()) {
  console.log(decryptRecoveryFileRes.error.message);
  return;
}
console.log(decryptRecoveryFileRes.value);
```

## Local Installation

1. Clone & npm install:
```sh
git clone git@github.com:pubky/react-native-pubky.git && cd react-native-pubky && npm i
```
2. Delete the `rust/pubky` directory to prevent a memory error (This step will be removed once pubky is public).
3. Yarn add it to your project:
```sh
yarn add path/to/react-native-pubky
```

## Update Bindings

After making changes to any of the Rust files, the bindings will need to be updated. To do this, run the following command:

```sh
npm run update-bindings
```

Finally, ensure that `PubkyModule.kt`, `Pubky.swift`, `Pubky.mm` & `src/index.tsx` are updated accordingly based on the changes made to the Rust files.

## License

MIT

---

## Resources

- Project created with: [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
- [Building an Android App with Rust Using UniFFI](https://forgen.tech/en/blog/post/building-an-android-app-with-rust-using-uniffi)
- [Building an iOS App with Rust Using UniFFI](https://forgen.tech/en/blog/post/building-an-ios-app-with-rust-using-uniffi)

