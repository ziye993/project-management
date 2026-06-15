export function makeRunKey(projectPath, command) {
  return `${encodeURIComponent(projectPath)}:${command}`;
}

export function parseRunKey(key) {
  const idx = key.indexOf(':');
  return {
    projectPath: decodeURIComponent(key.slice(0, idx)),
    command: key.slice(idx + 1),
  };
}
