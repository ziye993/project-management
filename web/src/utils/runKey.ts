export function makeRunKey(projectPath: string, command: string) {
  return `${encodeURIComponent(projectPath)}:${command}`;
}

export function parseRunKey(key: string) {
  const idx = key.indexOf(':');
  return {
    projectPath: decodeURIComponent(key.slice(0, idx)),
    command: key.slice(idx + 1),
  };
}
