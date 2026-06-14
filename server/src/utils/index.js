import os from "os";

/**
 * 是否win平台
 * @returns {boolean}
 */
export const isWin = () => {
  return os.platform() === 'win32';
}