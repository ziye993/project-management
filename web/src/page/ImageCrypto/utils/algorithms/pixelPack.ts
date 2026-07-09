/** MD5 + Fisher-Yates shuffle — ported from pyscramble (MIT) */

function md5Bytes(input: string): Uint8Array {
  const K = new Int32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ]);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];

  const msg = new TextEncoder().encode(input);
  const bitLen = msg.length * 8;
  const padLen = ((56 - ((msg.length + 1) % 64)) + 64) % 64;
  const total = msg.length + 1 + padLen + 8;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, bitLen >>> 0, true);
  view.setUint32(total - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < total; offset += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) {
      M[i] = view.getInt32(offset + i * 4, true);
    }
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + K[i] + M[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << S[i % 4 + Math.floor(i / 16) * 4]) | (f >>> (32 - S[i % 4 + Math.floor(i / 16) * 4])))) | 0;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, a0, true);
  outView.setInt32(4, b0, true);
  outView.setInt32(8, c0, true);
  outView.setInt32(12, d0, true);
  return out;
}

export function shuffleWithKey(length: number, key: string): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i >= 1; i--) {
    const result = md5Bytes(`${key}${i}`);
    const hexVal = ((result[0] << 16) | (result[1] << 8) | result[2]) >>> 4;
    const rand = hexVal % (i + 1);
    [arr[rand], arr[i]] = [arr[i], arr[rand]];
  }
  return arr;
}

export function generateLogisticPositions(x1: number, n: number): number[] {
  const arr: [number, number][] = [];
  let x = x1;
  arr.push([x, 0]);
  for (let i = 1; i < n; i++) {
    x = 3.9999999 * x * (1 - x);
    arr.push([x, i]);
  }
  arr.sort((a, b) => a[0] - b[0]);
  return arr.map(item => item[1]);
}

export function packPixel(r: number, g: number, b: number, a: number): number {
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export function unpackPixel(pixel: number): [number, number, number, number] {
  const r = (pixel >> 16) & 0xff;
  const g = (pixel >> 8) & 0xff;
  const b = pixel & 0xff;
  const a = (pixel >> 24) & 0xff;
  return [r, g, b, a];
}

export function imageDataToInts(data: ImageData): number[] {
  const { data: d, width, height } = data;
  const count = width * height;
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const base = i * 4;
    out[i] = packPixel(d[base], d[base + 1], d[base + 2], d[base + 3]);
  }
  return out;
}

export function intsToImageData(ints: number[], width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  for (let i = 0; i < ints.length; i++) {
    const [r, g, b, a] = unpackPixel(ints[i]);
    const base = i * 4;
    out.data[base] = r;
    out.data[base + 1] = g;
    out.data[base + 2] = b;
    out.data[base + 3] = a;
  }
  return out;
}
