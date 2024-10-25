const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

const rustDir = 'rust';
const repoOwner = 'pubky';
const repoName = 'pubky-core-mobile-sdk';
const branch = 'main';
const tempDir = 'temp';

async function setupRustDirectory() {
  try {
    // Check if rust directory exists
    const rustExists = await fs
      .access(rustDir)
      .then(() => true)
      .catch(() => false);

    if (!rustExists) {
      console.log('Creating rust directory...');
      await fs.mkdir(rustDir);

      // Clone the repository directly into rust directory
      const git = simpleGit();
      await git.clone(
        `https://github.com/${repoOwner}/${repoName}.git`,
        tempDir,
        ['--depth', '1', `--branch=${branch}`]
      );

      // Move all contents from temp directory to rust directory
      const tempContents = await fs.readdir(path.join(tempDir));
      await Promise.all(
        tempContents.map(async (item) => {
          if (item !== '.git') {
            // Skip .git directory
            const source = path.join(tempDir, item);
            const dest = path.join(rustDir, item);
            await fs.cp(source, dest, { recursive: true });
          }
        })
      );

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('Rust directory setup completed successfully!');
    } else {
      console.log('Rust directory already exists, skipping setup...');
    }
  } catch (error) {
    console.error('Error during rust directory setup:', error);
    // Try to clean up temp directory if it exists
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to clean up temporary directory:', cleanupError);
    }
    throw error; // Re-throw to be handled by the main try-catch
  }
}

setupRustDirectory();
