import { generateLogisticPositions, imageDataToInts, intsToImageData } from './pixelPack';
import type { ScrambleAlgorithm } from './types';
import { validateNumberKey } from './types';

function generateLogisticSequence(xStart: number, n: number): number[] {
  const logisticArr: [number, number][] = [];
  let x = xStart;
  logisticArr.push([x, 0]);
  for (let i = 1; i < n; i++) {
    x = 3.9999999 * x * (1 - x);
    logisticArr.push([x, i]);
  }
  logisticArr.sort((a, b) => a[0] - b[0]);
  return logisticArr.map(item => item[1]);
}

function computeXSequence(key: number, count: number, length: number): number[] {
  const xValues: number[] = [];
  let x = key;
  for (let c = 0; c < count; c++) {
    xValues.push(x);
    for (let i = 0; i < length; i++) {
      x = 3.9999999 * x * (1 - x);
    }
  }
  return xValues;
}

function rowLogisticTransform(imageData: ImageData, key: number, encrypt: boolean): ImageData {
  const { width: w, height: h } = imageData;
  const pixels = imageDataToInts(imageData);
  const positions = generateLogisticPositions(key, w);
  const total = w * h;
  const newPixels = new Array<number>(total);

  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const row = Math.floor(idx / w);
    const m = positions[i]!;
    if (encrypt) {
      newPixels[idx] = pixels[m + row * w]!;
    } else {
      newPixels[m + row * w] = pixels[idx]!;
    }
  }

  return intsToImageData(newPixels, w, h);
}

function rowColumnLogisticTransform(imageData: ImageData, key: number, encrypt: boolean): ImageData {
  const { width: w, height: h } = imageData;
  const pixels = imageDataToInts(imageData);
  const total = w * h;

  if (encrypt) {
    const rowXValues = computeXSequence(key, h, w);
    const rowPositions = rowXValues.map(x => generateLogisticSequence(x, w));
    const buf = new Array<number>(total);
    for (let idx = 0; idx < total; idx++) {
      const i = idx % w;
      const j = Math.floor(idx / w);
      buf[idx] = pixels[rowPositions[j]![i]! + j * w]!;
    }
    const colXValues = computeXSequence(key, w, h);
    const colPositions = colXValues.map(x => generateLogisticSequence(x, h));
    const newPixels = new Array<number>(total);
    for (let idx = 0; idx < total; idx++) {
      const i = idx % w;
      const j = Math.floor(idx / w);
      newPixels[idx] = buf[i + colPositions[i]![j]! * w]!;
    }
    return intsToImageData(newPixels, w, h);
  }

  const colXValues = computeXSequence(key, w, h);
  const colPositions = colXValues.map(x => generateLogisticSequence(x, h));
  const buf = new Array<number>(total).fill(0);
  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const j = Math.floor(idx / w);
    buf[i + colPositions[i]![j]! * w] = pixels[idx]!;
  }
  const rowXValues = computeXSequence(key, h, w);
  const rowPositions = rowXValues.map(x => generateLogisticSequence(x, w));
  const newPixels = new Array<number>(total).fill(0);
  for (let idx = 0; idx < total; idx++) {
    const i = idx % w;
    const j = Math.floor(idx / w);
    newPixels[rowPositions[j]![i]! + j * w] = buf[idx]!;
  }
  return intsToImageData(newPixels, w, h);
}

export const picEncryptRowAlgorithm: ScrambleAlgorithm = {
  id: 'picEncryptRow',
  label: 'PicEncrypt 行模式',
  needsKey: true,
  keyType: 'number',
  keyRange: { min: 0, max: 1, open: true },
  validateKey: (key) => validateNumberKey(key, 0, 1, true),
  scramble: (imageData, key) => rowLogisticTransform(imageData, Number(key), true),
  unscramble: (imageData, key) => rowLogisticTransform(imageData, Number(key), false),
};

export const picEncryptRowColAlgorithm: ScrambleAlgorithm = {
  id: 'picEncryptRowCol',
  label: 'PicEncrypt 行+列模式',
  needsKey: true,
  keyType: 'number',
  keyRange: { min: 0, max: 1, open: true },
  validateKey: (key) => validateNumberKey(key, 0, 1, true),
  scramble: (imageData, key) => rowColumnLogisticTransform(imageData, Number(key), true),
  unscramble: (imageData, key) => rowColumnLogisticTransform(imageData, Number(key), false),
};
