import { post } from '.';
import type { DocTab } from '../type/docTab';

const basePath = '/swagger';

export interface SwaggerServerConfig {
  version: number;
  updatedAt: number | null;
  tabs: DocTab[];
  activeTabId: string | null;
}

export const getSwaggerConfig = async () => {
  return await post(basePath + '/getConfig', {});
};

export const setSwaggerConfig = async (param: {
  tabs: DocTab[];
  activeTabId: string | null;
}) => {
  return await post(basePath + '/setConfig', param as unknown as Record<string, unknown>);
};
