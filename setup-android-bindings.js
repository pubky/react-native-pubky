const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const directoriesToRemove = ['app', 'target'];

const removeDirectories = () => {
  directoriesToRemove.forEach((dir) => {
    const dirPath = path.resolve('rust', dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true });
      console.log(`Removed directory: ${dirPath}`);
    }
  });
};

const setupAndroidCommand = `
  sed -i '' 's/crate\\_type = .\\*/crate\\_type = \\["cdylib"\\]/' Cargo.toml && \\
  cargo build --release && \\
  cargo install cargo-ndk && \\
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android && \\
  cargo ndk -o ./app/src/main/jniLibs --manifest-path ./Cargo.toml -t armeabi-v7a -t arm64-v8a -t x86 -t x86_64 build --release && \\
  cargo run --bin uniffi-bindgen generate --library ./target/release/libmobile.dylib --language kotlin --out-dir ./app/src/main/java/tech/forgen/todolist/rust
`;

const postSetupAndroid = async () => {
  const rustMobileKt = path.resolve(
    'rust',
    'app',
    'src',
    'main',
    'java',
    'tech',
    'forgen',
    'todolist',
    'rust',
    'uniffi',
    'mobile',
    'mobile.kt'
  );
  const androidMobileKt = path.resolve(
    'android',
    'src',
    'main',
    'java',
    'uniffi',
    'mobile',
    'mobile.kt'
  );

  // Create the destination directory if it doesn't exist
  await fs.promises.mkdir(path.dirname(androidMobileKt), { recursive: true });

  // Copy rust/app/src/main/java/tech/forgen/todolist/rust/uniffi/mobile/mobile.kt to android/src/main/java/uniffi/mobile/mobile.kt
  await fs.promises.copyFile(rustMobileKt, androidMobileKt);
  console.log(`Copied ${rustMobileKt} to ${androidMobileKt}`);

  const rustJniLibs = path.resolve('rust', 'app', 'src', 'main', 'jniLibs');
  const androidJniLibs = path.resolve('android', 'src', 'main', 'jniLibs');

  // Copy rust/app/src/main/jniLibs to android/src/main/jniLibs
  await fs.promises.cp(rustJniLibs, androidJniLibs, {
    recursive: true,
    force: true,
  });
  console.log(`Copied contents of ${rustJniLibs} to ${androidJniLibs}`);
};

const originalDir = process.cwd();

const runSetup = async () => {
  try {
    removeDirectories();

    // Change the current working directory to the 'rust' directory
    process.chdir('rust');

    const { stdout, stderr } = await execAsync(setupAndroidCommand);
    console.log(`Setup Android command output: ${stdout}`);

    if (stderr) {
      console.error(`Setup Android command stderr: ${stderr}`);
    }

    // Revert to the original directory after setupAndroidCommand execution
    process.chdir(originalDir);

    await postSetupAndroid();
  } catch (error) {
    console.error(`Error executing setup-android command: ${error.message}`);
  }
};

runSetup();
