const fs = require('fs').promises;
const path = require('path');

const frameworkPath = 'rust/bindings/ios/PubkyCore.xcframework';
const frameworkDestinationPath = 'ios/Frameworks';
const swiftFilePath = 'rust/bindings/ios/pubkycore.swift';
const swiftDestinationPath = 'ios/';

async function runSetup() {
  try {
    console.log('Removing existing files...');
    // Remove destination directories if they exist
    await Promise.all([
      fs.rm(frameworkDestinationPath, { recursive: true, force: true }),
      fs.rm('ios/pubkycore.swift', { recursive: true, force: true }),
    ]);

    console.log('Creating directories...');
    // Create destination directories if they don't exist
    await Promise.all([
      fs.mkdir(frameworkDestinationPath, { recursive: true }),
      fs.mkdir(swiftDestinationPath, { recursive: true }),
    ]);

    // Copy framework to destination
    const frameworkTargetPath = path.join(
      frameworkDestinationPath,
      path.basename(frameworkPath)
    );
    await fs.cp(frameworkPath, frameworkTargetPath, { recursive: true });

    // Copy Swift file to destination
    const swiftTargetPath = path.join(
      swiftDestinationPath,
      path.basename(swiftFilePath)
    );
    await fs.copyFile(swiftFilePath, swiftTargetPath);

    console.log('Framework and Swift file copied successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

runSetup().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
