const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');

// Configuration
const repoOwner = 'pubky';
const repoName = 'pubky-core-mobile-sdk';
const branch = 'main';
const ktPath = 'bindings/android/pubkymobile.kt';
const ktDestinationPath = 'android/src/main/java/uniffi/pubkymobile/';
const jniPath = 'bindings/android/jniLibs';
const jniDestinationPath = 'android/src/main/jniLibs/';
const tempDir = 'temp';

async function runSetup() {
  try {
    console.log('Removing existing files...');
    // Remove destination directories if they exist & Clean up any lingering temporary directory
    await Promise.all([
      fs.rm(ktDestinationPath, { recursive: true, force: true }),
      fs.rm(jniDestinationPath, { recursive: true, force: true }),
      fs.rm(tempDir, { recursive: true, force: true }),
    ]);

    console.log('Creating directories...');
    // Create destination directories if they don't exist
    await Promise.all([
      fs.mkdir(ktDestinationPath, { recursive: true }),
      fs.mkdir(jniDestinationPath, { recursive: true }),
    ]);

    // Initialize Git
    const git = simpleGit();

    console.log('Cloning repository...');
    // Clone the repository sparsely
    await git.clone(
      `https://github.com/${repoOwner}/${repoName}.git`,
      tempDir,
      ['--depth', '1', '--filter=blob:none', '--sparse', `--branch=${branch}`]
    );

    // Change directory to the cloned repository
    const tempGit = simpleGit(tempDir);

    console.log('Setting up sparse checkout...');
    // Set sparse-checkout to include only the required directory
    await tempGit.raw(['sparse-checkout', 'set', 'bindings/android']);

    console.log('Copying Kotlin file...');
    // Copy Kotlin file to destination
    const ktSourcePath = path.join(tempDir, ktPath);
    const ktTargetPath = path.join(ktDestinationPath, 'pubkymobile.kt');
    await fs.copyFile(ktSourcePath, ktTargetPath);

    console.log('Copying JNI libraries...');
    // Copy JNI libraries directory
    const jniSourcePath = path.join(tempDir, jniPath);
    const jniTargetPath = jniDestinationPath;
    await fs.cp(jniSourcePath, jniTargetPath, { recursive: true });

    console.log('Cleaning up...');
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('Android files downloaded and copied successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    // Try to clean up temp directory if it exists
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to clean up temporary directory:', cleanupError);
    }
    process.exit(1);
  }
}

runSetup().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
