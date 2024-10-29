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
  cargo run --bin uniffi-bindgen generate --library ./target/release/libpubkycore.dylib --language swift --out-dir ./bindings && \\
  rustup target add aarch64-apple-ios-sim aarch64-apple-ios && \\
  cargo build --release --target=aarch64-apple-ios-sim && \\
  cargo build --release --target=aarch64-apple-ios && \\
  mv bindings/pubkycoreFFI.modulemap bindings/module.modulemap && \\
  xcodebuild -create-xcframework -library ./target/aarch64-apple-ios-sim/release/libpubkycore.a -headers ./bindings -library ./target/aarch64-apple-ios/release/libpubkycore.a -headers ./bindings -output "ios/PubkyCore.xcframework"
`;

const originalDir = process.cwd();

const postSetupIos = async () => {
  const rustBindingsPubkyCoreSwift = path.resolve(
    'rust',
    'bindings',
    'pubkycore.swift'
  );
  const iosPubkyCoreSwift = path.resolve('ios', 'pubkycore.swift');

  // Copy rust/bindings/pubkycore.swift file to ios/ directory
  await fs.promises.copyFile(rustBindingsPubkyCoreSwift, iosPubkyCoreSwift);
  console.log(`Copied ${rustBindingsPubkyCoreSwift} to ${iosPubkyCoreSwift}`);

  // Delete rust/ios/PubkyCore.xcframework/ios-arm64/Headers/pubkycore.swift
  const iosArm64HeadersPubkyCoreSwift = path.resolve(
    'rust',
    'ios',
    'PubkyCore.xcframework',
    'ios-arm64',
    'Headers',
    'pubkycore.swift'
  );
  if (fs.existsSync(iosArm64HeadersPubkyCoreSwift)) {
    await fs.promises.unlink(iosArm64HeadersPubkyCoreSwift);
    console.log(`Deleted ${iosArm64HeadersPubkyCoreSwift}`);
  }

  // Delete rust/ios/PubkyCore.xcframework/ios-arm64-simulator/Headers/pubkycore.swift
  const iosArm64SimulatorHeadersPubkyCoreSwift = path.resolve(
    'rust',
    'ios',
    'PubkyCore.xcframework',
    'ios-arm64-simulator',
    'Headers',
    'pubkycore.swift'
  );
  if (fs.existsSync(iosArm64SimulatorHeadersPubkyCoreSwift)) {
    await fs.promises.unlink(iosArm64SimulatorHeadersPubkyCoreSwift);
    console.log(`Deleted ${iosArm64SimulatorHeadersPubkyCoreSwift}`);
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
