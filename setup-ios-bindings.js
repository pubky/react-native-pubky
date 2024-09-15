const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const directoriesToRemove = ['bindings', 'ios', 'target'];

const removeDirectories = () => {
  directoriesToRemove.forEach((dir) => {
    const dirPath = path.resolve('rust', dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true });
      console.log(`Removed directory: ${dirPath}`);
    }
  });
};

const setupIosCommand = `
  export IPHONEOS_DEPLOYMENT_TARGET=13.4
  sed -i '' 's/crate_type = .*/crate_type = ["cdylib", "staticlib"]/' Cargo.toml && \\
  cargo build --release && \\
  cargo run --bin uniffi-bindgen generate --library ./target/release/libpubkymobile.dylib --language swift --out-dir ./bindings && \\
  rustup target add aarch64-apple-ios-sim aarch64-apple-ios && \\
  cargo build --release --target=aarch64-apple-ios-sim && \\
  cargo build --release --target=aarch64-apple-ios && \\
  mv bindings/pubkymobileFFI.modulemap bindings/module.modulemap && \\
  xcodebuild -create-xcframework -library ./target/aarch64-apple-ios-sim/release/libpubkymobile.a -headers ./bindings -library ./target/aarch64-apple-ios/release/libpubkymobile.a -headers ./bindings -output "ios/PubkyMobile.xcframework"
`;

const originalDir = process.cwd();

const postSetupIos = async () => {
  const rustBindingsPubkyMobileSwift = path.resolve(
    'rust',
    'bindings',
    'pubkymobile.swift'
  );
  const iosPubkyMobileSwift = path.resolve('ios', 'pubkymobile.swift');

  // Copy rust/bindings/pubkymobile.swift file to ios/ directory
  await fs.promises.copyFile(rustBindingsPubkyMobileSwift, iosPubkyMobileSwift);
  console.log(
    `Copied ${rustBindingsPubkyMobileSwift} to ${iosPubkyMobileSwift}`
  );

  // Delete rust/ios/PubkyMobile.xcframework/ios-arm64/Headers/pubkymobile.swift
  const iosArm64HeadersPubkyMobileSwift = path.resolve(
    'rust',
    'ios',
    'PubkyMobile.xcframework',
    'ios-arm64',
    'Headers',
    'pubkymobile.swift'
  );
  if (fs.existsSync(iosArm64HeadersPubkyMobileSwift)) {
    await fs.promises.unlink(iosArm64HeadersPubkyMobileSwift);
    console.log(`Deleted ${iosArm64HeadersPubkyMobileSwift}`);
  }

  // Delete rust/ios/PubkyMobile.xcframework/ios-arm64-simulator/Headers/pubkymobile.swift
  const iosArm64SimulatorHeadersPubkyMobileSwift = path.resolve(
    'rust',
    'ios',
    'PubkyMobile.xcframework',
    'ios-arm64-simulator',
    'Headers',
    'pubkymobile.swift'
  );
  if (fs.existsSync(iosArm64SimulatorHeadersPubkyMobileSwift)) {
    await fs.promises.unlink(iosArm64SimulatorHeadersPubkyMobileSwift);
    console.log(`Deleted ${iosArm64SimulatorHeadersPubkyMobileSwift}`);
  }

  const rustIos = path.resolve('rust', 'ios');
  const frameworksDir = path.resolve('ios', 'Frameworks');

  // Copy contents of rust/ios/ to Frameworks directory
  await fs.promises.cp(rustIos, frameworksDir, {
    recursive: true,
    force: true,
  });
  console.log(`Copied contents of ${rustIos} to ${frameworksDir}`);
};

const runSetup = async () => {
  try {
    removeDirectories();

    // Change the current working directory to the 'rust' directory
    process.chdir('rust');

    const { stdout, stderr } = await execAsync(setupIosCommand);
    console.log(`Setup iOS command output: ${stdout}`);

    if (stderr) {
      console.error(`Setup iOS command stderr: ${stderr}`);
    }

    // Revert to the original directory after setupIosCommand
    process.chdir(originalDir);

    await postSetupIos();
  } catch (error) {
    console.error(`Error executing setup-ios command: ${error.message}`);
  }
};

runSetup();
