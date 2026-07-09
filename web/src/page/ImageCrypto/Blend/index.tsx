import { useCallback, useEffect, useState } from 'react';
import message from '@/components/ui/Modal/message';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useImageCryptoSettings } from '../hooks/useImageCryptoSettings';
import ImageUploader from '../components/ImageUploader';
import BlendSliders from '../components/BlendSliders';
import ParamImportExport from '../components/ParamImportExport';
import SaveToServerButton from '../components/SaveToServerButton';
import { DEFAULT_BLEND_PARAMS, blendImages, type BlendParams } from '../utils/algorithms/blend';
import { loadImageFromFile } from '../utils/canvas/loadImage';
import { imageDataFromSource, imageDataToObjectUrl } from '../utils/canvas/imageDataFromSource';
import { exportBlob } from '../utils/canvas/exportBlob';
import { formatBlendParamString } from '../utils/paramString';
import shared from '../shared.module.less';

export default function BlendTab() {
  const { settings } = useImageCryptoSettings();
  const [imageA, setImageA] = useState<ImageData | null>(null);
  const [imageB, setImageB] = useState<ImageData | null>(null);
  const [params, setParams] = useState<BlendParams>(DEFAULT_BLEND_PARAMS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadA = async (file: File, report: (msg: string) => void) => {
    report('正在读取图 A…');
    const img = await loadImageFromFile(file);
    report('正在解码…');
    await new Promise(r => setTimeout(r, 0));
    setImageA(imageDataFromSource(img, settings.maxImageEdgePx).imageData);
  };

  const loadB = async (file: File, report: (msg: string) => void) => {
    report('正在读取图 B…');
    const img = await loadImageFromFile(file);
    report('正在解码…');
    await new Promise(r => setTimeout(r, 0));
    setImageB(imageDataFromSource(img, settings.maxImageEdgePx).imageData);
  };

  const refresh = useCallback(() => {
    if (!imageA || !imageB) {
      setPreviewUrl(null);
      return;
    }
    const out = blendImages(imageA, imageB, params);
    setPreviewUrl(imageDataToObjectUrl(out));
  }, [imageA, imageB, params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const paramString = formatBlendParamString(params, settings.blendParamCodes);

  const copyOnly = async () => {
    const ok = await copyTextToClipboard(paramString);
    message[ok ? 'success' : 'error'](ok ? '已复制参数字符串' : '复制失败');
  };

  return (
    <div className={shared.panel}>
      <p className={shared.disclaimer}>{settings.disclaimerText}</p>

      <ImageUploader label="上传图 A（底层）" onFile={loadA} />
      <ImageUploader label="上传图 B（叠加层）" onFile={loadB} />

      <BlendSliders params={params} codes={settings.blendParamCodes} onChange={setParams} />
      <ParamImportExport params={params} codes={settings.blendParamCodes} onImport={setParams} />

      <div className={shared.toolbar}>
        <SaveToServerButton
          disabled={!imageA || !imageB}
          getBlob={async () => {
            const out = blendImages(imageA!, imageB!, params);
            return exportBlob(out, 'image/jpeg', settings.exportJpegQuality);
          }}
          filename={`blend-${Date.now()}.jpg`}
          kind="blend"
          params={params as unknown as Record<string, unknown>}
          paramString={paramString}
          copyParamToClipboard
          encodeFilename
        />
        <button type="button" className={`${shared.btn} ${shared.btnSecondary}`} onClick={copyOnly}>
          仅复制参数
        </button>
      </div>

      {previewUrl && <img className={shared.preview} src={previewUrl} alt="合并预览" />}
    </div>
  );
}
