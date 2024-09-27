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
### Methods to be Implemented
- [ ] signIn: Sign-in to a homeserver.
- [ ] signUp: Sign-up to a homeserver and update Pkarr accordingly.
- [ ] signOut: Sign-out from a homeserver.
- [ ] put: Upload a small payload to a given path.
- [ ] get: Download a small payload from a given path relative to a pubky author.


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

