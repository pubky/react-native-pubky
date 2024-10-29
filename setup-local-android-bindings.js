const fs = require('fs').promises;
const path = require('path');

const ktPath = 'rust/bindings/android/pubkycore.kt';
const ktDestinationPath = 'android/src/main/java/uniffi/pubkycore/';
const jniPath = 'rust/bindings/android/jniLibs';
const jniDestinationPath = 'android/src/main/jniLibs/';

async function runSetup() {
  try {
    console.log('Removing existing files...');
    // Remove destination directories if they exist
    await Promise.all([
      fs.rm(ktDestinationPath, { recursive: true, force: true }),
      fs.rm(jniDestinationPath, { recursive: true, force: true }),
    ]);

    console.log('Creating directories...');
    // Create destination directories if they don't exist
    await Promise.all([
      fs.mkdir(ktDestinationPath, { recursive: true }),
      fs.mkdir(jniDestinationPath, { recursive: true }),
    ]);

    console.log('Copying Kotlin file...');
    // Copy Kotlin file to destination
    const ktTargetPath = path.join(ktDestinationPath, 'pubkycore.kt');
    await fs.copyFile(ktPath, ktTargetPath);

    console.log('Copying JNI libraries...');
    // Copy JNI libraries directory
    await fs.cp(jniPath, jniDestinationPath, { recursive: true });

    console.log('Android files copied successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

runSetup().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
