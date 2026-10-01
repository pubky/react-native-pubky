const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const rustDirectory = path.resolve('rust');
const kotlinSource = path.join(
  rustDirectory,
  'bindings',
  'android',
  'pubkycore.kt'
);
const kotlinDestination = path.resolve(
  'android',
  'src',
  'main',
  'java',
  'uniffi',
  'pubkycore',
  'pubkycore.kt'
);
const jniSource = path.join(rustDirectory, 'bindings', 'android', 'jniLibs');
const jniDestination = path.resolve('android', 'src', 'main', 'jniLibs');

async function runSetup() {
  console.log('Building Android bindings with pubky-core-ffi...');
  const { stdout, stderr } = await execFileAsync('./build_android.sh', {
    cwd: rustDirectory,
    maxBuffer: 16 * 1024 * 1024,
  });
  process.stdout.write(stdout);
  process.stderr.write(stderr);

  await Promise.all([
    fs.rm(path.dirname(kotlinDestination), { recursive: true, force: true }),
    fs.rm(jniDestination, { recursive: true, force: true }),
  ]);
  await Promise.all([
    fs.mkdir(path.dirname(kotlinDestination), { recursive: true }),
    fs.mkdir(jniDestination, { recursive: true }),
  ]);

  await fs.copyFile(kotlinSource, kotlinDestination);
  await fs.cp(jniSource, jniDestination, { recursive: true });

  console.log('Android bindings built and copied successfully!');
}

runSetup().catch((error) => {
  console.error('Error during Android binding setup:', error);
  process.exit(1);
});
