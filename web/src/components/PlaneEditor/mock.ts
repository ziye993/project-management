import type { PlaneSavedData, PlanePageConfig, TConfigRef } from './themes/types';

const STORAGE_KEY = 'plane-editor-config';

export interface MockDevice {
  label: string;
  value: string;
}

export interface MockStation {
  siteName: string;
}

export const mockDevices: MockDevice[] = [
  { label: 'SKC-1053_数控车床', value: 'SKC-1053' },
  { label: 'GCJ-1037_数控滚齿机', value: 'GCJ-1037' },
  { label: 'MCJ-1003_磨齿机', value: 'MCJ-1003' },
  { label: 'JCJ-1002_搓齿机', value: 'JCJ-1002' },
];

export const mockStations: MockStation[] = [
  { siteName: '站台-A01' },
  { siteName: '站台-A02' },
  { siteName: '站台-B01' },
];

const defaultSaved: PlaneSavedData = {
  seedId: 1,
  theme: 'rect',
  width: 1920,
  height: 1080,
  canvasBackground: 'rgb(1,42,116)',
  devBoxDefaultBackground: '#354866',
  siteBoxDefaultBackground: '#3d5a4a',
  textDefaultBackground: '#354866',
  data: [],
};

export async function loadPlaneConfig(): Promise<PlaneSavedData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSaved };
    const parsed = JSON.parse(raw) as PlaneSavedData;
    return { ...defaultSaved, ...parsed };
  } catch {
    return { ...defaultSaved };
  }
}

export async function savePlaneConfig(config: PlaneSavedData): Promise<{ success: boolean }> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return { success: true };
}

export function getMockStationsForDevice(_equipmentKey?: string): MockStation[] {
  return mockStations;
}

export type { PlaneSavedData, PlanePageConfig, TConfigRef };
