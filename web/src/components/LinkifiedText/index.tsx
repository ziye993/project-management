import message from '@/components/ui/Modal/message';
import { copyTextToClipboard } from '@/utils/clipboard';
import { splitTextByUrls } from '@/utils/linkify';
import styles from './index.module.less';

interface LinkifiedTextProps {
  text: string;
}

export default function LinkifiedText({ text }: LinkifiedTextProps) {
  const segments = splitTextByUrls(text);

  const handleLinkClick = async (event: React.MouseEvent<HTMLSpanElement>, url: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const ok = await copyTextToClipboard(url);
    message[ok ? 'success' : 'error'](ok ? '链接已复制' : '复制失败，请手动复制');
  };

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'url') {
          return (
            <span
              key={`${index}-${segment.value}`}
              className={styles.link}
              title="点击复制，Ctrl+点击新窗口打开"
              onClick={(event) => handleLinkClick(event, segment.value)}
            >
              {segment.value}
            </span>
          );
        }
        return <span key={`${index}-text`}>{segment.value}</span>;
      })}
    </>
  );
}
