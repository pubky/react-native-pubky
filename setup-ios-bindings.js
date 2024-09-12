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
  cargo run --bin uniffi-bindgen generate --library ./target/release/libmobile.dylib --language swift --out-dir ./bindings && \\
  rustup target add aarch64-apple-ios-sim aarch64-apple-ios && \\
  cargo build --release --target=aarch64-apple-ios-sim && \\
  cargo build --release --target=aarch64-apple-ios && \\
  mv bindings/mobileFFI.modulemap bindings/module.modulemap && \\
  xcodebuild -create-xcframework -library ./target/aarch64-apple-ios-sim/release/libmobile.a -headers ./bindings -library ./target/aarch64-apple-ios/release/libmobile.a -headers ./bindings -output "ios/Mobile.xcframework"
`;

const originalDir = process.cwd();

const postSetupIos = async () => {
  const rustBindingsMobileSwift = path.resolve(
    'rust',
    'bindings',
    'mobile.swift'
  );
  const iosMobileSwift = path.resolve('ios', 'mobile.swift');

  // Copy rust/bindings/mobile.swift file to ios/ directory
  await fs.promises.copyFile(rustBindingsMobileSwift, iosMobileSwift);
  console.log(`Copied ${rustBindingsMobileSwift} to ${iosMobileSwift}`);

  // Delete rust/ios/Mobile.xcframework/ios-arm64/Headers/mobile.swift
  const iosArm64HeadersMobileSwift = path.resolve(
    'rust',
    'ios',
    'Mobile.xcframework',
    'ios-arm64',
    'Headers',
    'mobile.swift'
  );
  if (fs.existsSync(iosArm64HeadersMobileSwift)) {
    await fs.promises.unlink(iosArm64HeadersMobileSwift);
    console.log(`Deleted ${iosArm64HeadersMobileSwift}`);
  }

  // Delete rust/ios/Mobile.xcframework/ios-arm64-simulator/Headers/mobile.swift
  const iosArm64SimulatorHeadersMobileSwift = path.resolve(
    'rust',
    'ios',
    'Mobile.xcframework',
    'ios-arm64-simulator',
    'Headers',
    'mobile.swift'
  );
  if (fs.existsSync(iosArm64SimulatorHeadersMobileSwift)) {
    await fs.promises.unlink(iosArm64SimulatorHeadersMobileSwift);
    console.log(`Deleted ${iosArm64SimulatorHeadersMobileSwift}`);
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
