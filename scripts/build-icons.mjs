// Generates simple placeholder PNG icons (rounded blue square with a white
// diamond) with zero dependencies, using Node's built-in zlib for PNG's
// deflate-compressed IDAT chunks. Run: node scripts/build-icons.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, "icons");

const BG = [79, 140, 255]; // accent blue, matches popup.css --accent
const FG = [255, 255, 255];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pixelColor(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = size * 0.22;

  // Rounded-square background test.
  const dxEdge = Math.max(0, Math.abs(x + 0.5 - cx) - (cx - cornerRadius));
  const dyEdge = Math.max(0, Math.abs(y + 0.5 - cy) - (cy - cornerRadius));
  const outsideRoundedSquare = Math.sqrt(dxEdge * dxEdge + dyEdge * dyEdge) > cornerRadius;
  if (outsideRoundedSquare) return null; // transparent

  // White diamond in the middle (rotated square), representing translation/swap.
  const nx = Math.abs(x + 0.5 - cx) / (size * 0.32);
  const ny = Math.abs(y + 0.5 - cy) / (size * 0.32);
  if (nx + ny < 1) return FG;

  return BG;
}

function buildPng(size) {
  const rowBytes = size * 4 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const color = pixelColor(x, y, size);
      const off = y * rowBytes + 1 + x * 4;
      if (color) {
        raw[off] = color[0];
        raw[off + 1] = color[1];
        raw[off + 2] = color[2];
        raw[off + 3] = 255;
      } else {
        raw[off] = raw[off + 1] = raw[off + 2] = raw[off + 3] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const size of [16, 48, 128]) {
    const png = buildPng(size);
    const outPath = path.join(OUT_DIR, `icon${size}.png`);
    await writeFile(outPath, png);
    console.log(`Wrote ${outPath} (${png.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
