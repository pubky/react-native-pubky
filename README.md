# react-native-pubky

React Native implementation of [pubky](https://github.com/pubky/pubky)

## Installation

```sh
npm install @synonymdev/react-native-pubky
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

## Usage

```js
import { auth } from '@synonymdev/react-native-pubky';

const authRes = await auth("pubkyAuthUrl", "secretKey");
if (authRes.isErr()) {
  console.log(authRes.error.message);
  return;
}
console.log(authRes.value);
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

