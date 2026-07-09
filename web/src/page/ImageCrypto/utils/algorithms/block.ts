import { imageDataToInts, intsToImageData, shuffleWithKey } from './pixelPack';
import type { ScrambleAlgorithm, ScrambleOptions } from './types';

function blockCounts(width: number, height: number, blockSize: number) {
  const xbc = Math.max(1, Math.ceil(width / blockSize));
  const ybc = Math.max(1, Math.ceil(height / blockSize));
  return { xbc, ybc };
}

function blockEncrypt(
  pixels: number[],
  width: number,
  height: number,
  key: string,
  xbc: number,
  ybc: number,
): { ints: number[]; width: number; height: number } {
  const w = width;
  const h = height;
  const newWidth = w % xbc > 0 ? w + xbc - (w % xbc) : w;
  const newHeight = h % ybc > 0 ? h + ybc - (h % ybc) : h;
  const blockWidth = newWidth / xbc;
  const blockHeight = newHeight / ybc;
  const xArray = shuffleWithKey(xbc, key);
  const yArray = shuffleWithKey(ybc, key);
  const total = newWidth * newHeight;
  const newPixels = new Array<number>(total);

  for (let idx = 0; idx < total; idx++) {
    const i = idx % newWidth;
    const j = Math.floor(idx / newWidth);
    let n = j;
    let m = (xArray[(Math.floor(n / blockHeight)) % xbc]! * blockWidth + i) % newWidth;
    m = xArray[Math.floor(m / blockWidth)]! * blockWidth + (m % blockWidth);
    n = (yArray[(Math.floor(m / blockWidth)) % ybc]! * blockHeight + n) % newHeight;
    n = yArray[Math.floor(n / blockHeight)]! * blockHeight + (n % blockHeight);
    newPixels[idx] = pixels[(m % w) + (n % h) * w]!;
  }

  return { ints: newPixels, width: newWidth, height: newHeight };
}

function blockDecrypt(
  pixels: number[],
  width: number,
  height: number,
  key: string,
  xbc: number,
  ybc: number,
): number[] {
  const w = width;
  const h = height;
  const blockWidth = w / xbc;
  const blockHeight = h / ybc;
  const xArray = shuffleWithKey(xbc, key);
  const yArray = shuffleWithKey(ybc, key);
  const total = w * h;
  const newPixels = new Array<number>(total).fill(0);

  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const j = Math.floor(idx / w);
    let n = j;
    let m = (xArray[(Math.floor(n / blockHeight)) % xbc]! * blockWidth + i) % w;
    m = xArray[Math.floor(m / blockWidth)]! * blockWidth + (m % blockWidth);
    n = (yArray[(Math.floor(m / blockWidth)) % ybc]! * blockHeight + n) % h;
    n = yArray[Math.floor(n / blockHeight)]! * blockHeight + (n % blockHeight);
    newPixels[m + n * w] = pixels[idx]!;
  }

  return newPixels;
}

export const blockAlgorithm: ScrambleAlgorithm = {
  id: 'block',
  label: '块混淆',
  needsKey: true,
  keyType: 'string',
  validateKey: (key) => key.length > 0,
  scramble: (imageData, key, options?: ScrambleOptions) => {
    const blockSize = options?.blockSize ?? 16;
    const { width, height } = imageData;
    const { xbc, ybc } = blockCounts(width, height, blockSize);
    const pixels = imageDataToInts(imageData);
    const result = blockEncrypt(pixels, width, height, String(key), xbc, ybc);
    return intsToImageData(result.ints, result.width, result.height);
  },
  unscramble: (imageData, key, options?: ScrambleOptions) => {
    const blockSize = options?.blockSize ?? 16;
    const { width, height } = imageData;
    const { xbc, ybc } = blockCounts(width, height, blockSize);
    const pixels = imageDataToInts(imageData);
    const ints = blockDecrypt(pixels, width, height, String(key), xbc, ybc);
    return intsToImageData(ints, width, height);
  },
};
