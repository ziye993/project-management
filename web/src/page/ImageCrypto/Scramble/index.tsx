import { useCallback, useState } from 'react';
import message from '@/components/ui/Modal/message';
import { useImageCryptoSettings } from '../hooks/useImageCryptoSettings';
import ImageUploader from '../components/ImageUploader';
import AlgorithmSelect from '../components/AlgorithmSelect';
import KeyInput, { isKeyValid } from '../components/KeyInput';
import SaveToServerButton from '../components/SaveToServerButton';
import { getAlgorithm } from '../utils/algorithms/registry';
import { loadImageFromFile } from '../utils/canvas/loadImage';
import { imageDataFromSource, imageDataToObjectUrl } from '../utils/canvas/imageDataFromSource';
import { exportBlob } from '../utils/canvas/exportBlob';
import shared from '../shared.module.less';

export default function ScrambleTab() {
  const { settings } = useImageCryptoSettings();
  const [algorithmId, setAlgorithmId] = useState(settings.defaultAlgorithmId);
  const [key, setKey] = useState('');
  const [source, setSource] = useState<ImageData | null>(null);
  const [result, setResult] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadFile = async (file: File, report: (msg: string) => void) => {
    report('正在解码图片…');
    const img = await loadImageFromFile(file);
    report('正在准备预览…');
    await new Promise(r => setTimeout(r, 0));
    const maxEdge = settings.maxImageEdgePx;
    const { imageData, scaled } = imageDataFromSource(img, maxEdge);
    if (scaled) {
      message.info(`图片已缩放至最大边长 ${maxEdge}px`);
    }
    setSource(imageData);
    setResult(null);
    setPreviewUrl(imageDataToObjectUrl(imageData));
  };

  const run = useCallback(async (mode: 'scramble' | 'unscramble') => {
    if (!source) {
      message.info('请先上传图片');
      return;
    }
    const algo = getAlgorithm(algorithmId);
    if (!algo) return;
    if (!isKeyValid(algorithmId, key)) {
      message.error('请填写有效密钥');
      return;
    }
    setProcessing(true);
    setProgress(10);
    try {
      await new Promise(r => setTimeout(r, 0));
      const fn = mode === 'scramble' ? algo.scramble : algo.unscramble;
      const out = fn(source, key, { blockSize: settings.blockSize, onProgress: setProgress });
      setProgress(100);
      setResult(out);
      setPreviewUrl(imageDataToObjectUrl(out));
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [source, algorithmId, key, settings.blockSize]);

  const output = result ?? source;
  const keyOk = isKeyValid(algorithmId, key);

  return (
    <div className={shared.panel}>
      <p className={shared.disclaimer}>{settings.disclaimerText}</p>
      <p className={shared.hint}>请使用原图密文进行解密；平台二次压缩可能导致无法还原。</p>

      <ImageUploader onFile={loadFile} />

      <AlgorithmSelect value={algorithmId} onChange={setAlgorithmId} />
      <KeyInput
        algorithmId={algorithmId}
        value={key}
        hint={settings.defaultKeyHint}
        onChange={setKey}
      />

      <div className={shared.toolbar}>
        <button type="button" className={shared.btn} disabled={!source || !keyOk || processing} onClick={() => run('scramble')}>
          加密
        </button>
        <button type="button" className={`${shared.btn} ${shared.btnSecondary}`} disabled={!source || !keyOk || processing} onClick={() => run('unscramble')}>
          解密
        </button>
        <SaveToServerButton
          disabled={!output}
          getBlob={() => exportBlob(output!, 'image/jpeg', settings.exportJpegQuality)}
          filename={`scramble-${Date.now()}.jpg`}
        />
      </div>

      {processing && (
        <div className={shared.progress}>
          <div className={shared.progressBar} style={{ width: `${progress || 30}%` }} />
        </div>
      )}

      {previewUrl && (
        <img className={shared.preview} src={previewUrl} alt="预览" />
      )}
    </div>
  );
}
