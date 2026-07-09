/** @typedef {import('../../../web/src/type/imageCryptoSettings.js').ImageCryptoSettings} ImageCryptoSettings */

export const DEFAULT_IMAGE_CRYPTO_SETTINGS = {
  exportJpegQuality: 0.95,
  maxImageEdgePx: 4096,
  disclaimerText: '本工具非密码学加密，请勿用于隐私数据',
  defaultAlgorithmId: 'xiaofanqie',
  defaultKeyHint: '0.666',
  blockSize: 16,
  mirageWatermarkEnabled: true,
  mirageWatermarkFontSize: 14,
  mirageWatermarkPosition: 'bottom-right',
  mirageWatermarkOffsetX: 8,
  mirageWatermarkOffsetY: 8,
  mirageWatermarkText: '隐写图',
  mirageWatermarkColor: 'rgba(255,255,255,0.85)',
  mirageWatermarkStroke: 'rgba(0,0,0,0.6)',
  presetGroupCount: 8,
  presetsPerGroup: 2,
  minRefineRounds: 3,
  revealLevelMin: 0,
  revealLevelMax: 80,
  revealLevelHighMin: 175,
  revealLevelHighMax: 255,
  revealContrastMin: -50,
  revealContrastMax: 50,
  revealGammaMin: 0.5,
  revealGammaMax: 2.0,
  blendParamCodes: {
    exposure: 'E',
    contrast: 'C',
    saturation: 'S',
    opacity: 'O',
    blendMode: 'M',
  },
};

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseOptionalString(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

export function normalizeImageCryptoSettings(input = {}) {
  const d = DEFAULT_IMAGE_CRYPTO_SETTINGS;
  const codes = input.blendParamCodes && typeof input.blendParamCodes === 'object'
    ? input.blendParamCodes
    : {};

  return {
    exportJpegQuality: clampNumber(input.exportJpegQuality, 0.1, 1, d.exportJpegQuality),
    maxImageEdgePx: clampNumber(input.maxImageEdgePx, 256, 16384, d.maxImageEdgePx),
    disclaimerText: parseOptionalString(input.disclaimerText, d.disclaimerText),
    defaultAlgorithmId: parseOptionalString(input.defaultAlgorithmId, d.defaultAlgorithmId),
    defaultKeyHint: parseOptionalString(input.defaultKeyHint, d.defaultKeyHint),
    blockSize: clampNumber(input.blockSize, 2, 256, d.blockSize),
    mirageWatermarkEnabled: input.mirageWatermarkEnabled !== false,
    mirageWatermarkFontSize: clampNumber(input.mirageWatermarkFontSize, 8, 48, d.mirageWatermarkFontSize),
    mirageWatermarkPosition: 'bottom-right',
    mirageWatermarkOffsetX: clampNumber(input.mirageWatermarkOffsetX, 0, 200, d.mirageWatermarkOffsetX),
    mirageWatermarkOffsetY: clampNumber(input.mirageWatermarkOffsetY, 0, 200, d.mirageWatermarkOffsetY),
    mirageWatermarkText: parseOptionalString(input.mirageWatermarkText, d.mirageWatermarkText),
    mirageWatermarkColor: parseOptionalString(input.mirageWatermarkColor, d.mirageWatermarkColor),
    mirageWatermarkStroke: parseOptionalString(input.mirageWatermarkStroke, d.mirageWatermarkStroke),
    presetGroupCount: clampNumber(input.presetGroupCount, 4, 16, d.presetGroupCount),
    presetsPerGroup: clampNumber(input.presetsPerGroup, 1, 4, d.presetsPerGroup),
    minRefineRounds: clampNumber(input.minRefineRounds, 1, 20, d.minRefineRounds),
    revealLevelMin: clampNumber(input.revealLevelMin, 0, 255, d.revealLevelMin),
    revealLevelMax: clampNumber(input.revealLevelMax, 0, 255, d.revealLevelMax),
    revealLevelHighMin: clampNumber(input.revealLevelHighMin, 0, 255, d.revealLevelHighMin),
    revealLevelHighMax: clampNumber(input.revealLevelHighMax, 0, 255, d.revealLevelHighMax),
    revealContrastMin: clampNumber(input.revealContrastMin, -100, 100, d.revealContrastMin),
    revealContrastMax: clampNumber(input.revealContrastMax, -100, 100, d.revealContrastMax),
    revealGammaMin: clampNumber(input.revealGammaMin, 0.1, 5, d.revealGammaMin),
    revealGammaMax: clampNumber(input.revealGammaMax, 0.1, 5, d.revealGammaMax),
    blendParamCodes: {
      exposure: parseOptionalString(codes.exposure, d.blendParamCodes.exposure),
      contrast: parseOptionalString(codes.contrast, d.blendParamCodes.contrast),
      saturation: parseOptionalString(codes.saturation, d.blendParamCodes.saturation),
      opacity: parseOptionalString(codes.opacity, d.blendParamCodes.opacity),
      blendMode: parseOptionalString(codes.blendMode, d.blendParamCodes.blendMode),
    },
  };
}
