export interface BlendParamCodes {
  exposure: string;
  contrast: string;
  saturation: string;
  opacity: string;
  blendMode: string;
}

export interface ImageCryptoSettings {
  exportJpegQuality: number;
  maxImageEdgePx: number;
  disclaimerText: string;
  defaultAlgorithmId: string;
  defaultKeyHint: string;
  blockSize: number;
  mirageWatermarkEnabled: boolean;
  mirageWatermarkFontSize: number;
  mirageWatermarkPosition: 'bottom-right';
  mirageWatermarkOffsetX: number;
  mirageWatermarkOffsetY: number;
  mirageWatermarkText: string;
  mirageWatermarkColor: string;
  mirageWatermarkStroke: string;
  presetGroupCount: number;
  presetsPerGroup: number;
  minRefineRounds: number;
  revealLevelMin: number;
  revealLevelMax: number;
  revealLevelHighMin: number;
  revealLevelHighMax: number;
  revealContrastMin: number;
  revealContrastMax: number;
  revealGammaMin: number;
  revealGammaMax: number;
  blendParamCodes: BlendParamCodes;
}

export const DEFAULT_IMAGE_CRYPTO_SETTINGS: ImageCryptoSettings = {
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

export function mergeImageCryptoSettings(
  raw?: Partial<ImageCryptoSettings> | null,
): ImageCryptoSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_IMAGE_CRYPTO_SETTINGS };
  }
  const codes = raw.blendParamCodes;
  return {
    ...DEFAULT_IMAGE_CRYPTO_SETTINGS,
    ...raw,
    blendParamCodes: {
      ...DEFAULT_IMAGE_CRYPTO_SETTINGS.blendParamCodes,
      ...(codes && typeof codes === 'object' ? codes : {}),
    },
  };
}
