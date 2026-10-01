const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
const ELF_CLASS_64 = 2;
const ELF_DATA_LITTLE_ENDIAN = 1;
const ELF_DATA_BIG_ENDIAN = 2;
const LOAD_SEGMENT = 1;
const MIN_LOAD_ALIGNMENT = 16 * 1024;
const ABI_DIRECTORIES = ['arm64-v8a', 'x86_64'];

function readElf64LoadAlignments(libraryPath) {
  const elf = fs.readFileSync(libraryPath);

  if (elf.length < 64 || !elf.subarray(0, 4).equals(ELF_MAGIC)) {
    throw new Error(`${libraryPath} is not an ELF file`);
  }
  if (elf[4] !== ELF_CLASS_64) {
    throw new Error(`${libraryPath} is not a 64-bit ELF file`);
  }

  const byteOrder = elf[5];
  if (
    byteOrder !== ELF_DATA_LITTLE_ENDIAN &&
    byteOrder !== ELF_DATA_BIG_ENDIAN
  ) {
    throw new Error(`${libraryPath} has an unsupported ELF byte order`);
  }

  const readUInt16 =
    byteOrder === ELF_DATA_LITTLE_ENDIAN
      ? (offset) => elf.readUInt16LE(offset)
      : (offset) => elf.readUInt16BE(offset);
  const readUInt32 =
    byteOrder === ELF_DATA_LITTLE_ENDIAN
      ? (offset) => elf.readUInt32LE(offset)
      : (offset) => elf.readUInt32BE(offset);
  const readUInt64 =
    byteOrder === ELF_DATA_LITTLE_ENDIAN
      ? (offset) => Number(elf.readBigUInt64LE(offset))
      : (offset) => Number(elf.readBigUInt64BE(offset));

  const programHeaderOffset = readUInt64(32);
  const programHeaderEntrySize = readUInt16(54);
  const programHeaderCount = readUInt16(56);

  if (programHeaderEntrySize < 56) {
    throw new Error(
      `${libraryPath} has an invalid ELF program header entry size`
    );
  }

  const alignments = [];
  for (let index = 0; index < programHeaderCount; index += 1) {
    const headerOffset = programHeaderOffset + index * programHeaderEntrySize;
    if (headerOffset + 56 > elf.length) {
      throw new Error(
        `${libraryPath} has a truncated ELF program header table`
      );
    }
    if (readUInt32(headerOffset) === LOAD_SEGMENT) {
      alignments.push(readUInt64(headerOffset + 48));
    }
  }

  if (alignments.length === 0) {
    throw new Error(`${libraryPath} has no ELF LOAD segments`);
  }

  return alignments;
}

function verifyAndroidPageSize(
  jniLibsPath = path.resolve('android', 'src', 'main', 'jniLibs')
) {
  const failures = [];
  let libraryCount = 0;

  for (const abi of ABI_DIRECTORIES) {
    const abiPath = path.join(jniLibsPath, abi);
    if (!fs.existsSync(abiPath)) {
      failures.push(`missing 64-bit ABI directory: ${abiPath}`);
      continue;
    }

    const libraries = fs
      .readdirSync(abiPath)
      .filter((fileName) => fileName.endsWith('.so'));
    if (libraries.length === 0) {
      failures.push(`no shared libraries found in ${abiPath}`);
      continue;
    }

    for (const fileName of libraries) {
      libraryCount += 1;
      const libraryPath = path.join(abiPath, fileName);
      try {
        const alignments = readElf64LoadAlignments(libraryPath);
        console.log(
          `${libraryPath}: LOAD alignments ${alignments
            .map((alignment) => `0x${alignment.toString(16)}`)
            .join(', ')}`
        );
        for (const alignment of alignments) {
          if (alignment < MIN_LOAD_ALIGNMENT) {
            failures.push(
              `${libraryPath} has LOAD alignment 0x${alignment.toString(
                16
              )}; expected 0x4000 or greater`
            );
          }
        }
      } catch (error) {
        failures.push(error.message);
      }
    }
  }

  if (libraryCount === 0 || failures.length > 0) {
    throw new Error(
      `Android 16 KB page-size verification failed:\n${failures
        .map((failure) => `- ${failure}`)
        .join('\n')}`
    );
  }

  console.log(
    'All bundled 64-bit Android ELF LOAD segments are aligned to 0x4000 or greater.'
  );
}

if (require.main === module) {
  try {
    verifyAndroidPageSize(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { readElf64LoadAlignments, verifyAndroidPageSize };
