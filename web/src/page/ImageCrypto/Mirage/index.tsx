import { useCallback, useEffect, useState } from 'react';
import message from '@/components/ui/Modal/message';
import { useImageCryptoSettings } from '../hooks/useImageCryptoSettings';
import ImageUploader from '../components/ImageUploader';
import SaveToServerButton from '../components/SaveToServerButton';
import { synthesizeMirage, revealMirage, type RevealParams } from '../utils/algorithms/mirage';
import { applyMirageWatermark } from '../utils/canvas/drawWatermark';
import { loadImageFromFile } from '../utils/canvas/loadImage';
import { imageDataFromSource, imageDataToObjectUrl } from '../utils/canvas/imageDataFromSource';
import { exportBlob } from '../utils/canvas/exportBlob';
import shared from '../shared.module.less';

type MirageMode = 'compose' | 'separate';

export default function MirageTab() {
  const { settings } = useImageCryptoSettings();
  const [mode, setMode] = useState<MirageMode>('compose');
  const [surface, setSurface] = useState<ImageData | null>(null);
  const [inner, setInner] = useState<ImageData | null>(null);
  const [stego, setStego] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightUrl, setLightUrl] = useState<string | null>(null);
  const [darkUrl, setDarkUrl] = useState<string | null>(null);
  const [revealParams, setRevealParams] = useState<RevealParams>({
    levelMin: 0,
    levelMax: 64,
    contrast: 0,
    gamma: 1,
  });

  const loadSurface = async (file: File, report: (msg: string) => void) => {
    report('正在读取表图…');
    const img = await loadImageFromFile(file);
    report('正在解码…');
    await new Promise(r => setTimeout(r, 0));
    const { imageData } = imageDataFromSource(img, settings.maxImageEdgePx);
    setSurface(imageData);
  };

  const loadInner = async (file: File, report: (msg: string) => void) => {
    report('正在读取里图…');
    const img = await loadImageFromFile(file);
    report('正在解码…');
    await new Promise(r => setTimeout(r, 0));
    const { imageData } = imageDataFromSource(img, settings.maxImageEdgePx);
    setInner(imageData);
  };

  const loadStego = async (file: File, report: (msg: string) => void) => {
    report('正在读取隐写图…');
    const img = await loadImageFromFile(file);
    report('正在解码…');
    await new Promise(r => setTimeout(r, 0));
    const { imageData } = imageDataFromSource(img, settings.maxImageEdgePx);
    setStego(imageData);
    setPreviewUrl(imageDataToObjectUrl(imageData));
  };

  const compose = useCallback(() => {
    if (!surface || !inner) {
      message.info('请上传表图和里图');
      return;
    }
    let result = synthesizeMirage(surface, inner);
    result = applyMirageWatermark(result, settings);
    setStego(result);
    setPreviewUrl(imageDataToObjectUrl(result));
    message.success('合成完成');
  }, [surface, inner, settings]);

  useEffect(() => {
    if (mode !== 'separate' || !stego) {
      setLightUrl(null);
      setDarkUrl(null);
      return;
    }
    const light = revealMirage(stego, revealParams, 'light');
    const dark = revealMirage(stego, revealParams, 'dark');
    setLightUrl(imageDataToObjectUrl(light));
    setDarkUrl(imageDataToObjectUrl(dark));
  }, [mode, stego, revealParams]);

  const updateReveal = (key: keyof RevealParams, value: number) => {
    setRevealParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={shared.panel}>
      <p className={shared.disclaimer}>{settings.disclaimerText}</p>

      <div className={shared.subTabs}>
        <button type="button" className={`${shared.subTab} ${mode === 'compose' ? shared.subTabActive : ''}`} onClick={() => setMode('compose')}>合成</button>
        <button type="button" className={`${shared.subTab} ${mode === 'separate' ? shared.subTabActive : ''}`} onClick={() => setMode('separate')}>手动分离</button>
      </div>

      {mode === 'compose' ? (
        <>
          <ImageUploader label="上传表图（表面）" onFile={loadSurface} />
          <ImageUploader label="上传里图（隐藏）" onFile={loadInner} />
          <div className={shared.toolbar}>
            <button type="button" className={shared.btn} onClick={compose}>合成幻影坦克</button>
            <SaveToServerButton
              disabled={!stego}
              getBlob={() => exportBlob(stego!, 'image/png')}
              filename={`mirage-${Date.now()}.png`}
              kind="mirage"
            />
          </div>
          {previewUrl && <img className={shared.preview} src={previewUrl} alt="合成结果" />}
        </>
      ) : (
        <>
          <ImageUploader label="上传隐写图" onFile={loadStego} />
          <div className={shared.sliders}>
            <label className={shared.sliderRow}>
              <span>色阶黑场</span>
              <input type="range" min={0} max={255} value={revealParams.levelMin} onChange={(e) => updateReveal('levelMin', Number(e.target.value))} />
              <span>{revealParams.levelMin}</span>
            </label>
            <label className={shared.sliderRow}>
              <span>色阶白场</span>
              <input type="range" min={0} max={255} value={revealParams.levelMax} onChange={(e) => updateReveal('levelMax', Number(e.target.value))} />
              <span>{revealParams.levelMax}</span>
            </label>
            <label className={shared.sliderRow}>
              <span>对比度</span>
              <input type="range" min={-50} max={50} value={revealParams.contrast} onChange={(e) => updateReveal('contrast', Number(e.target.value))} />
              <span>{revealParams.contrast}</span>
            </label>
            <label className={shared.sliderRow}>
              <span>伽马</span>
              <input type="range" min={50} max={200} value={revealParams.gamma * 100} onChange={(e) => updateReveal('gamma', Number(e.target.value) / 100)} />
              <span>{revealParams.gamma.toFixed(2)}</span>
            </label>
          </div>
          <div className={shared.toolbar}>
            <SaveToServerButton
              disabled={!lightUrl}
              getBlob={async () => {
                const light = revealMirage(stego!, revealParams, 'light');
                return exportBlob(light, 'image/png');
              }}
              filename={`reveal-light-${Date.now()}.png`}
              kind="reveal"
              params={revealParams as unknown as Record<string, unknown>}
            />
            <SaveToServerButton
              disabled={!darkUrl}
              getBlob={async () => {
                const dark = revealMirage(stego!, revealParams, 'dark');
                return exportBlob(dark, 'image/png');
              }}
              filename={`reveal-dark-${Date.now()}.png`}
              kind="reveal"
              params={revealParams as unknown as Record<string, unknown>}
            />
          </div>
          <div className={shared.previewPair}>
            {lightUrl && <figure><img className={shared.preview} src={lightUrl} alt="浅底" /><figcaption>浅底显形</figcaption></figure>}
            {darkUrl && <figure><img className={shared.preview} src={darkUrl} alt="深底" /><figcaption>深底显形</figcaption></figure>}
          </div>
        </>
      )}
    </div>
  );
}
