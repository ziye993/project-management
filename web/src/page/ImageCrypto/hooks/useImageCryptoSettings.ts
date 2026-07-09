import { useEffect, useState } from 'react';
import { getConfig } from '@/api/setConfig';
import {
  mergeImageCryptoSettings,
  type ImageCryptoSettings,
} from '@/type/imageCryptoSettings';

let cachedSettings: ImageCryptoSettings | null = null;

export function useImageCryptoSettings() {
  const [settings, setSettings] = useState<ImageCryptoSettings>(
    () => cachedSettings ?? mergeImageCryptoSettings(null),
  );
  const [loading, setLoading] = useState(!cachedSettings);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await getConfig();
      const merged = mergeImageCryptoSettings(res?.data?.imageCryptoSettings);
      cachedSettings = merged;
      setSettings(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cachedSettings) reload();
  }, []);

  return { settings, loading, reload };
}

export function invalidateImageCryptoSettingsCache() {
  cachedSettings = null;
}
