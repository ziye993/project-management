export function exportBlob(
  imageData: ImageData,
  mime: 'image/png' | 'image/jpeg',
  quality = 0.95,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('导出失败'))),
      mime,
      quality,
    );
  });
}
