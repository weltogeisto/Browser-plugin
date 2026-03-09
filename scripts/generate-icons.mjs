import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(tag, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const name = Buffer.from(tag, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([len, name, data, crc]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);

  const setPixel = (x, y, rgba) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = rgba[0];
    pixels[i + 1] = rgba[1];
    pixels[i + 2] = rgba[2];
    pixels[i + 3] = rgba[3];
  };

  const fillRect = (x0, y0, w, h, rgba) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        setPixel(x, y, rgba);
      }
    }
  };

  const bg = [24, 28, 40, 255];
  const accent = [87, 179, 255, 255];
  const white = [240, 245, 255, 255];

  fillRect(0, 0, size, size, bg);

  const pad = Math.max(1, Math.floor(size / 14));
  const bw = Math.max(1, Math.floor(size / 24));
  fillRect(pad, pad, size - pad * 2, bw, accent);
  fillRect(pad, size - pad - bw, size - pad * 2, bw, accent);
  fillRect(pad, pad, bw, size - pad * 2, accent);
  fillRect(size - pad - bw, pad, bw, size - pad * 2, accent);

  const cx = Math.floor(size / 2);
  const top = Math.floor(size / 4);
  const beamY = Math.floor(size / 3);

  fillRect(cx - bw, top, bw * 2 + 1, Math.floor(size / 2), white);
  fillRect(Math.floor(size / 4), beamY - bw, Math.floor(size / 2), bw * 2 + 1, white);

  const panRadius = Math.max(2, Math.floor(size / 8));
  const leftCx = Math.floor(size / 2.9);
  const rightCx = Math.floor(size / 1.55);
  const panY = Math.floor(size / 1.8);

  for (let x = -panRadius; x <= panRadius; x += 1) {
    const y = Math.floor(Math.abs(x) / 2);
    for (let t = -bw; t <= bw; t += 1) {
      setPixel(leftCx + x, panY + y + t, white);
      setPixel(rightCx + x, panY + y + t, white);
    }
  }

  for (let i = 0; i < Math.floor(size / 6); i += 1) {
    for (let t = -bw; t <= bw; t += 1) {
      setPixel(leftCx - Math.floor(i / 2) + t, beamY + i, white);
      setPixel(rightCx + Math.floor(i / 2) + t, beamY + i, white);
    }
  }

  return pixels;
}

function encodePng(width, height, rgbaPixels) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const start = y * width * 4;
    const row = rgbaPixels.subarray(start, start + width * 4);
    rows.push(Buffer.concat([Buffer.from([0]), row]));
  }
  const raw = Buffer.concat(rows);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const out = `src/icons/icon-${size}.png`;
  mkdirSync(dirname(out), { recursive: true });
  const png = encodePng(size, size, drawIcon(size));
  writeFileSync(out, png);
  console.log(`wrote ${out}`);
}
