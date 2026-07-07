export interface CustomProjectCommand {
  id: string;
  title: string;
  command: string;
}

export const CUSTOM_CMD_PREFIX = '__custom__:';

export function customCommandValue(id: string) {
  return `${CUSTOM_CMD_PREFIX}${id}`;
}

export function isCustomCommandValue(value: string) {
  return value.startsWith(CUSTOM_CMD_PREFIX);
}

export function parseCustomCommandId(value: string) {
  return value.slice(CUSTOM_CMD_PREFIX.length);
}

export function createCustomCommandId(title: string) {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').replace(/^-|-$/g, '') || 'cmd';
  return `${slug}-${Date.now()}`;
}
