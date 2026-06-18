/** 将分组色与白色混合，用于项目列表行背景 */
export function softenRowColor(color?: string, percent = 42): string | undefined {
  if (!color) return undefined;
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

/** 指令按钮背景，比行背景略淡 */
export function softenButtonColor(color?: string): string | undefined {
  return softenRowColor(color, 30);
}

export function mixBorderColor(color?: string): string | undefined {
  if (!color) return undefined;
  return `color-mix(in srgb, ${color} 50%, #e2e8f0)`;
}
