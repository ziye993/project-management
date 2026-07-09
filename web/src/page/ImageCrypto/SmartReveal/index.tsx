import { useCallback, useEffect, useMemo, useState } from 'react';
import message from '@/components/ui/Modal/message';
import { useImageCryptoSettings } from '../hooks/useImageCryptoSettings';
import ImageUploader, { type UploadStatusReporter } from '../components/ImageUploader';
import PresetGrid from '../components/PresetGrid';
import RevealHistory from '../components/RevealHistory';
import SaveToServerButton from '../components/SaveToServerButton';
import { revealMirage } from '../utils/algorithms/mirage';
import { loadImageFromFile } from '../utils/canvas/loadImage';
import { imageDataFromSource, imageDataToObjectUrl } from '../utils/canvas/imageDataFromSource';
import { exportBlob } from '../utils/canvas/exportBlob';
import {
  boundsFromSettings,
  refineBounds,
  samplePresets,
} from '../utils/smartReveal/samplePresets';
import type { RevealParams } from '../utils/algorithms/mirage';
import type { PresetGroup, RevealRound, SmartRevealSession } from '../utils/smartReveal/sessionState';
import {
  clearSmartRevealDraft,
  loadSmartRevealDraft,
  restoreSessionFromDraft,
  saveSmartRevealDraft,
  type SmartRevealDraft,
} from '../utils/smartReveal/draftStorage';
import { formatRevealParamString } from '../utils/paramString';
import shared from '../shared.module.less';
import styles from './index.module.less';

function yieldToUi() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

async function buildPresetGroupsAsync(
  source: ImageData,
  paramsList: RevealParams[],
  report?: UploadStatusReporter,
): Promise<PresetGroup[]> {
  const groups: PresetGroup[] = [];
  for (let index = 0; index < paramsList.length; index++) {
    report?.(`正在生成预设 ${index + 1} / ${paramsList.length}…`);
    await yieldToUi();
    const params = paramsList[index]!;
    const light = revealMirage(source, params, 'light');
    const dark = revealMirage(source, params, 'dark');
    groups.push({
      index,
      params,
      lightPreviewUrl: imageDataToObjectUrl(light),
      darkPreviewUrl: imageDataToObjectUrl(dark),
    });
  }
  return groups;
}

async function createFirstRound(
  settings: ReturnType<typeof useImageCryptoSettings>['settings'],
  source: ImageData,
  report?: UploadStatusReporter,
): Promise<RevealRound> {
  const globalBounds = boundsFromSettings(settings);
  report?.(`正在采样 ${settings.presetGroupCount} 组探针参数…`);
  await yieldToUi();
  const paramsList = samplePresets(globalBounds, settings.presetGroupCount, { roundIndex: 0, aggressive: true });
  return {
    roundIndex: 0,
    bounds: globalBounds,
    presets: await buildPresetGroupsAsync(source, paramsList, report),
  };
}

async function createSession(
  settings: ReturnType<typeof useImageCryptoSettings>['settings'],
  source: ImageData,
  report?: UploadStatusReporter,
  sessionId?: string,
): Promise<SmartRevealSession> {
  return {
    sessionId: sessionId ?? crypto.randomUUID(),
    sourceImageData: source,
    globalBounds: boundsFromSettings(settings),
    rounds: [await createFirstRound(settings, source, report)],
    currentRoundIndex: 0,
  };
}

export default function SmartRevealTab() {
  const { settings } = useImageCryptoSettings();
  const [session, setSession] = useState<SmartRevealSession | null>(null);
  const [pendingDraft, setPendingDraft] = useState<SmartRevealDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  const currentRound = session?.rounds[session.currentRoundIndex];

  useEffect(() => {
    const draft = loadSmartRevealDraft();
    if (draft) setPendingDraft(draft);
  }, []);

  useEffect(() => {
    if (!session?.sourceImageData) return;
    saveSmartRevealDraft(session);
  }, [session]);

  const loadFile = async (file: File, report: UploadStatusReporter) => {
    report('正在解码图片…');
    const img = await loadImageFromFile(file);
    report('正在准备像素数据…');
    await yieldToUi();
    const { imageData, scaled } = imageDataFromSource(img, settings.maxImageEdgePx);
    if (scaled) message.info(`图片已缩放至最大边长 ${settings.maxImageEdgePx}px`);
    clearSmartRevealDraft();
    setPendingDraft(null);
    const next = await createSession(settings, imageData, report);
    setSession(next);
    report('预设已生成，请对比选择');
  };

  const resumeDraft = async () => {
    if (!pendingDraft) return;
    setProcessing(true);
    setProcessStatus('正在恢复草稿…');
    const restored = await restoreSessionFromDraft(pendingDraft, buildPresetGroupsAsync);
    setProcessing(false);
    setProcessStatus('');
    if (!restored) {
      message.error('无法恢复草稿，请重新上传');
      clearSmartRevealDraft();
      setPendingDraft(null);
      return;
    }
    setSession(restored);
    setPendingDraft(null);
    message.success(`已恢复至第 ${restored.currentRoundIndex + 1} 轮`);
  };

  const dismissDraft = () => {
    clearSmartRevealDraft();
    setPendingDraft(null);
  };

  const selectPreset = useCallback(async (index: number) => {
    if (!session?.sourceImageData || processing) return;
    const round = session.rounds[session.currentRoundIndex];
    if (!round) return;

    setProcessing(true);
    setProcessStatus('正在收窄参数并生成下一轮…');

    try {
      const updatedRound: RevealRound = { ...round, selectedIndex: index };
      const rounds = session.rounds.slice(0, session.currentRoundIndex + 1);
      rounds[session.currentRoundIndex] = updatedRound;

      const refinedBounds = refineBounds(
        round.bounds,
        round.presets.map(p => p.params),
        index,
        settings.presetGroupCount,
        session.globalBounds,
      );

      const nextRoundIndex = session.currentRoundIndex + 1;
      const paramsList = samplePresets(refinedBounds, settings.presetGroupCount, {
        roundIndex: nextRoundIndex,
        aggressive: nextRoundIndex <= 1,
      });
      const presets = await buildPresetGroupsAsync(
        session.sourceImageData,
        paramsList,
        setProcessStatus,
      );
      const nextRound: RevealRound = {
        roundIndex: nextRoundIndex,
        bounds: refinedBounds,
        presets,
      };

      rounds.push(nextRound);

      setSession({
        ...session,
        rounds,
        currentRoundIndex: nextRoundIndex,
      });

      if (nextRoundIndex >= settings.minRefineRounds) {
        message.info(`已完成 ${nextRoundIndex} 轮收窄，可直接保存或在轮次历史中回溯调整`);
      }
    } finally {
      setProcessing(false);
      setProcessStatus('');
    }
  }, [session, settings, processing]);

  const goToRound = (index: number) => {
    if (!session || processing) return;
    setSession({ ...session, currentRoundIndex: index });
    setSaveTarget(null);
  };

  const [saveTarget, setSaveTarget] = useState<{
    roundIndex: number;
    presetIndex: number;
    variant: 'light' | 'dark';
  } | null>(null);

  const getSaveBlob = useCallback(async () => {
    if (!session?.sourceImageData || !saveTarget) {
      throw new Error('无保存目标');
    }
    const round = session.rounds[saveTarget.roundIndex];
    const preset = round?.presets[saveTarget.presetIndex];
    if (!preset) throw new Error('预设不存在');
    const revealed = revealMirage(
      session.sourceImageData,
      preset.params,
      saveTarget.variant === 'light' ? 'light' : 'dark',
    );
    clearSmartRevealDraft();
    return exportBlob(revealed, 'image/png');
  }, [session, saveTarget]);

  const saveParamString = saveTarget
    ? formatRevealParamString(
        session?.rounds[saveTarget.roundIndex]?.presets[saveTarget.presetIndex]?.params ?? {
          levelMin: 0,
          levelMax: 255,
          contrast: 0,
          gamma: 1,
        },
      )
    : undefined;

  const canNext = currentRound?.selectedIndex === undefined;

  const hint = useMemo(() => {
    if (!session) {
      return `上传隐写图开始智能显形 · 首轮 ${settings.presetGroupCount} 组探针（极值分散采样）· 点击预览可放大`;
    }
    return `第 ${session.currentRoundIndex + 1} 轮 · ${currentRound?.presets.length ?? 0} 组候选 · 共 ${session.rounds.length} 轮历史`;
  }, [session, settings.presetGroupCount, currentRound?.presets.length]);

  return (
    <div className={`${shared.panel} ${shared.panelWide}`}>
      <p className={shared.disclaimer}>{settings.disclaimerText}</p>
      <p className={shared.hint}>{hint}</p>

      {processing && (
        <div className={styles.processBanner} role="status">
          <span className={styles.processSpinner} aria-hidden />
          <span>{processStatus || '处理中…'}</span>
        </div>
      )}

      {pendingDraft && !session && (
        <div className={styles.draftBanner}>
          <span>
            检测到未完成的显形（第 {pendingDraft.currentRoundIndex + 1} 轮），刷新页面后可在此继续。
            关闭标签页后草稿会清除。
          </span>
          <div className={styles.draftActions}>
            <button type="button" className={shared.btn} onClick={() => void resumeDraft()}>继续</button>
            <button type="button" className={`${shared.btn} ${shared.btnSecondary}`} onClick={dismissDraft}>放弃</button>
          </div>
        </div>
      )}

      <ImageUploader label="上传隐写图" onFile={loadFile} disabled={processing} />

      {session && currentRound && (
        <div className={styles.workspace}>
          <RevealHistory
            rounds={session.rounds}
            currentIndex={session.currentRoundIndex}
            onGoTo={goToRound}
          />
          <PresetGrid
            presets={currentRound.presets}
            selectedIndex={currentRound.selectedIndex}
            onSelect={(idx) => void selectPreset(idx)}
            onSave={(presetIndex, variant) => {
              setSaveTarget({ roundIndex: session.currentRoundIndex, presetIndex, variant });
            }}
          />
          <div className={shared.toolbar}>
            {saveTarget && (
              <SaveToServerButton
                getBlob={getSaveBlob}
                kind="smartReveal"
                paramString={saveParamString}
                copyParamToClipboard
                filename={`smart-reveal-${saveTarget.variant}-${Date.now()}.png`}
              />
            )}
            {session.currentRoundIndex > 0 && (
              <button
                type="button"
                className={`${shared.btn} ${shared.btnSecondary}`}
                disabled={processing}
                onClick={() => goToRound(session.currentRoundIndex - 1)}
              >
                上一步
              </button>
            )}
            {canNext && !processing && (
              <span className={shared.hint}>对比浅底/深底，选择差异最明显的一组</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
