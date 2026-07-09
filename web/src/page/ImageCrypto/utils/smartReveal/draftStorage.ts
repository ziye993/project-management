import type { RevealParams } from '../algorithms/mirage';
import type { RevealBounds } from './samplePresets';
import type { RevealRound, SmartRevealSession } from './sessionState';

const DRAFT_KEY = 'imageCrypto_smartReveal_draft';
const MAX_DRAFT_EDGE = 1200;

export interface SmartRevealDraft {
  savedAt: number;
  sessionId: string;
  sourceDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  globalBounds: RevealBounds;
  rounds: Array<{
    roundIndex: number;
    bounds: RevealBounds;
    selectedIndex?: number;
    presetParams: RevealParams[];
  }>;
  currentRoundIndex: number;
}

function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error('草稿图片加载失败'));
    img.src = dataUrl;
  });
}

export function compressImageDataForDraft(imageData: ImageData, quality = 0.88): string {
  const { width, height } = imageData;
  const maxEdge = Math.max(width, height);
  const scale = maxEdge > MAX_DRAFT_EDGE ? MAX_DRAFT_EDGE / maxEdge : 1;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  tmp.getContext('2d')!.putImageData(imageData, 0, 0);
  ctx.drawImage(tmp, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function saveSmartRevealDraft(session: SmartRevealSession): boolean {
  if (!session.sourceImageData) return false;
  try {
    const sourceDataUrl = compressImageDataForDraft(session.sourceImageData);
    const draft: SmartRevealDraft = {
      savedAt: Date.now(),
      sessionId: session.sessionId,
      sourceDataUrl,
      sourceWidth: session.sourceImageData.width,
      sourceHeight: session.sourceImageData.height,
      globalBounds: session.globalBounds,
      currentRoundIndex: session.currentRoundIndex,
      rounds: session.rounds.map(round => ({
        roundIndex: round.roundIndex,
        bounds: round.bounds,
        selectedIndex: round.selectedIndex,
        presetParams: round.presets.map(p => p.params),
      })),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadSmartRevealDraft(): SmartRevealDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SmartRevealDraft;
    if (!draft?.sourceDataUrl || !Array.isArray(draft.rounds)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearSmartRevealDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export async function restoreSessionFromDraft(
  draft: SmartRevealDraft,
  rebuildPresets: (
    source: ImageData,
    paramsList: RevealParams[],
  ) => RevealRound['presets'] | Promise<RevealRound['presets']>,
): Promise<SmartRevealSession | null> {
  try {
    const sourceImageData = await dataUrlToImageData(draft.sourceDataUrl);
    const rounds: RevealRound[] = [];
    for (const r of draft.rounds) {
      const presets = await rebuildPresets(sourceImageData, r.presetParams);
      rounds.push({
        roundIndex: r.roundIndex,
        bounds: r.bounds,
        selectedIndex: r.selectedIndex,
        presets,
      });
    }
    return {
      sessionId: draft.sessionId,
      sourceImageData,
      globalBounds: draft.globalBounds,
      rounds,
      currentRoundIndex: draft.currentRoundIndex,
    };
  } catch {
    return null;
  }
}
