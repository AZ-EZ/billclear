import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const outDir = new URL("../dist/assets/icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function writePng(path, size, maskable = false) {
  const width = size;
  const height = size;
  const rows = [];
  const center = size / 2;
  const safeRadius = maskable ? size * 0.46 : size * 0.42;
  const innerRadius = size * 0.16;

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = 1 + x * 4;
      const inOuter = dist < safeRadius;
      const inInner = Math.abs(x - center) < innerRadius && Math.abs(y - center) < innerRadius * 1.35;
      const bar = Math.abs(x - center + size * 0.07) < size * 0.035 && Math.abs(y - center) < size * 0.22;
      const topLoop = Math.abs(x - center + size * 0.005) < size * 0.11 && Math.abs(y - center + size * 0.095) < size * 0.085;
      const bottomLoop = Math.abs(x - center + size * 0.005) < size * 0.12 && Math.abs(y - center - size * 0.105) < size * 0.095;
      const letter = inInner && (bar || topLoop || bottomLoop);

      if (inOuter) {
        row[idx] = 8;
        row[idx + 1] = 122;
        row[idx + 2] = 122;
        row[idx + 3] = 255;
      } else {
        row[idx] = 246;
        row[idx + 1] = 248;
        row[idx + 2] = 251;
        row[idx + 3] = 255;
      }

      if (letter) {
        row[idx] = 255;
        row[idx + 1] = 255;
        row[idx + 2] = 255;
        row[idx + 3] = 255;
      }
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0))
  ]);

  writeFileSync(new URL(path, outDir), png);
}

writePng("icon-192.png", 192, false);
writePng("icon-512.png", 512, false);
writePng("maskable-512.png", 512, true);
