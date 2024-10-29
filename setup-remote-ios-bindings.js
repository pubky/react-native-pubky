const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');

// Configuration
const repoOwner = 'pubky';
const repoName = 'pubky-core-ffi';
const branch = 'main';
const frameworkPath = 'bindings/ios/PubkyCore.xcframework';
const frameworkDestinationPath = 'ios/Frameworks';
const swiftFilePath = 'bindings/ios/pubkycore.swift';
const swiftDestinationPath = 'ios/';
const tempDir = 'temp';

async function runSetup() {
  try {
    console.log('Removing existing files...');
    // Remove destination directories if they exist & Clean up any lingering temporary directory
    await Promise.all([
      fs.rm(frameworkDestinationPath, { recursive: true, force: true }),
      fs.rm('ios/pubkycore.swift', { recursive: true, force: true }),
      fs.rm(tempDir, { recursive: true, force: true }),
    ]);

    console.log('Creating directories...');
    // Create destination directories if they don't exist
    await Promise.all([
      fs.mkdir(frameworkDestinationPath, { recursive: true }),
      fs.mkdir(swiftDestinationPath, { recursive: true }),
    ]);

    // Initialize Git
    const git = simpleGit();

    // Clone the repository sparsely
    await git.clone(
      `https://github.com/${repoOwner}/${repoName}.git`,
      tempDir,
      ['--depth', '1', '--filter=blob:none', '--sparse', `--branch=${branch}`]
    );

    // Change directory to the cloned repository
    const tempGit = simpleGit(tempDir);

    // Set sparse-checkout to include only the required directory
    await tempGit.raw(['sparse-checkout', 'set', 'bindings/ios']);

    // Copy framework to destination
    const frameworkSourcePath = path.join(tempDir, frameworkPath);
    const frameworkTargetPath = path.join(
      frameworkDestinationPath,
      path.basename(frameworkPath)
    );
    await fs.cp(frameworkSourcePath, frameworkTargetPath, { recursive: true });

    // Copy Swift file to destination
    const swiftSourcePath = path.join(tempDir, swiftFilePath);
    const swiftTargetPath = path.join(
      swiftDestinationPath,
      path.basename(swiftFilePath)
    );
    await fs.copyFile(swiftSourcePath, swiftTargetPath);

    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('Framework and Swift file downloaded and copied successfully!');
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
