/** 将分组色与白色混合，用于项目列表行背景 */
export function softenRowColor(color?: string): string | undefined {
  if (!color) return undefined;
  return `color-mix(in srgb, ${color} 24%, white)`;
}
