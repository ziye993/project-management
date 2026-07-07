import { getConfig } from './jsonFile.js';

export const CUSTOM_CMD_PREFIX = '__custom__:';

export function customCommandValue(id) {
  return `${CUSTOM_CMD_PREFIX}${id}`;
}

export function parseCustomCommandId(value) {
  return value.startsWith(CUSTOM_CMD_PREFIX) ? value.slice(CUSTOM_CMD_PREFIX.length) : value;
}

export function findCustomProjectCommand(commandId) {
  const config = getConfig(true) || {};
  const list = normalizeCustomProjectCommands(config.customProjectCommands);
  return list.find(item => item.id === commandId) || null;
}

export function normalizeCustomProjectCommands(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const command = typeof item.command === 'string' ? item.command.trim() : '';
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : '';
      if (!title || !command) return null;
      return {
        id: id || `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        command,
      };
    })
    .filter(Boolean);
}
