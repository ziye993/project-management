import { blockAlgorithm } from './block';
import { picEncryptRowAlgorithm, picEncryptRowColAlgorithm } from './picEncrypt';
import { pixelAlgorithm } from './pixel';
import { rowAlgorithm } from './row';
import type { ScrambleAlgorithm } from './types';
import { xiaofanqieAlgorithm } from './xiaofanqie';

export const SCRAMBLE_ALGORITHMS: ScrambleAlgorithm[] = [
  xiaofanqieAlgorithm,
  blockAlgorithm,
  rowAlgorithm,
  pixelAlgorithm,
  picEncryptRowAlgorithm,
  picEncryptRowColAlgorithm,
];

export const ALGORITHM_MAP: Record<string, ScrambleAlgorithm> = Object.fromEntries(
  SCRAMBLE_ALGORITHMS.map(a => [a.id, a]),
);

export function getAlgorithm(id: string): ScrambleAlgorithm | undefined {
  return ALGORITHM_MAP[id];
}

export function getDefaultAlgorithmId(): string {
  return 'xiaofanqie';
}
