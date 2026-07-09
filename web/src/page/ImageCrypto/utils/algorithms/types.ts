export interface ScrambleOptions {
  blockSize?: number;
  onProgress?: (pct: number) => void;
}

export interface ScrambleAlgorithm {
  id: string;
  label: string;
  needsKey: boolean;
  keyType?: 'number' | 'string';
  keyRange?: { min: number; max: number; open?: boolean };
  scramble: (imageData: ImageData, key: string | number, options?: ScrambleOptions) => ImageData;
  unscramble: (imageData: ImageData, key: string | number, options?: ScrambleOptions) => ImageData;
  validateKey: (key: string) => boolean;
}

export function validateNumberKey(
  key: string,
  min: number,
  max: number,
  open = true,
): boolean {
  const n = Number(key);
  if (Number.isNaN(n)) return false;
  if (open) return n > min && n < max;
  return n >= min && n <= max;
}
