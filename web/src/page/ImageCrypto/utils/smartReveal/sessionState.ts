import type { RevealParams } from '../algorithms/mirage';
import type { RevealBounds } from './samplePresets';

export interface PresetGroup {
  index: number;
  params: RevealParams;
  lightPreviewUrl?: string;
  darkPreviewUrl?: string;
}

export interface RevealRound {
  roundIndex: number;
  bounds: RevealBounds;
  presets: PresetGroup[];
  selectedIndex?: number;
}

export interface SmartRevealSession {
  sessionId: string;
  sourceImageData: ImageData | null;
  globalBounds: RevealBounds;
  rounds: RevealRound[];
  currentRoundIndex: number;
}

export function createSession(
  sessionId: string,
  globalBounds: RevealBounds,
  firstRound: RevealRound,
): SmartRevealSession {
  return {
    sessionId,
    sourceImageData: null,
    globalBounds,
    rounds: [firstRound],
    currentRoundIndex: 0,
  };
}

export function truncateRoundsAfter(session: SmartRevealSession, roundIndex: number): void {
  session.rounds = session.rounds.slice(0, roundIndex + 1);
  session.currentRoundIndex = roundIndex;
}
