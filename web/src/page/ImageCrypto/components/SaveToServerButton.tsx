import { useState } from 'react';
import message from '@/components/ui/Modal/message';
import LinkCopyModal, { type LinkItem } from '@/components/LinkCopyModal';
import { uploadPic } from '@/api/media';
import { getFileLinks } from '@/api/media';
import { saveImageCryptoMeta } from '@/api/imageCrypto';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useAuth } from '@/hooks/useAuth';
import styles from './SaveToServerButton.module.less';

interface SaveToServerButtonProps {
  getBlob: () => Promise<Blob>;
  filename?: string;
  disabled?: boolean;
  kind?: string;
  params?: Record<string, unknown>;
  paramString?: string;
  copyParamToClipboard?: boolean;
  encodeFilename?: boolean;
}

export default function SaveToServerButton(props: SaveToServerButtonProps) {
  const { canWriteModule } = useAuth();
  const canWrite = canWriteModule('imageCrypto');
  const [saving, setSaving] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [links, setLinks] = useState<LinkItem[]>([]);

  const save = async () => {
    if (!canWrite) {
      message.error('当前通道无写入权限');
      return;
    }
    setSaving(true);
    try {
      const blob = await props.getBlob();
      const baseName = props.filename ?? `image-crypto-${Date.now()}.png`;
      const displayName = props.encodeFilename && props.paramString
        ? `blend_${props.paramString.replace(/\s+/g, '_')}.jpg`
        : baseName;

      const form = new FormData();
      form.append('files', blob, displayName);
      const res = await uploadPic(form);
      const stored = res?.data?.[0]?.storedName ?? res?.data?.storedName;
      if (!stored) {
        message.error('上传失败');
        return;
      }

      if (props.paramString || props.params) {
        await saveImageCryptoMeta({
          storedName: stored,
          kind: props.kind ?? 'generic',
          params: props.params,
          paramString: props.paramString,
        });
      }

      if (props.copyParamToClipboard && props.paramString) {
        await copyTextToClipboard(props.paramString);
        message.success('已保存并复制参数字符串');
      } else {
        message.success('已保存到服务器');
      }

      try {
        const linkRes = await getFileLinks('pic', stored);
        const items = linkRes?.data?.links ?? linkRes?.data ?? [];
        if (Array.isArray(items) && items.length) {
          setLinks(items.map((l: { label?: string; url: string; type?: string }) => ({
            type: l.type ?? 'link',
            label: l.label ?? '链接',
            url: l.url,
          })));
          setLinksOpen(true);
        }
      } catch {
        // links optional
      }
    } catch {
      // errors toasted by api layer
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.btn}
        disabled={props.disabled || saving || !canWrite}
        onClick={save}
      >
        {saving ? '保存中…' : '保存到服务器'}
      </button>
      <LinkCopyModal open={linksOpen} links={links} onClose={() => setLinksOpen(false)} />
    </>
  );
}
