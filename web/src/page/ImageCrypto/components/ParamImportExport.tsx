import message from '@/components/ui/Modal/message';
import { copyTextToClipboard } from '@/utils/clipboard';
import { formatBlendParamString, parseBlendParamString } from '../utils/paramString';
import type { BlendParams } from '../utils/algorithms/blend';
import type { BlendParamCodes } from '@/type/imageCryptoSettings';
import styles from './ParamImportExport.module.less';

interface ParamImportExportProps {
  params: BlendParams;
  codes: BlendParamCodes;
  onImport: (params: BlendParams) => void;
}

export default function ParamImportExport(props: ParamImportExportProps) {
  const str = formatBlendParamString(props.params, props.codes);

  const copy = async () => {
    const ok = await copyTextToClipboard(str);
    message[ok ? 'success' : 'error'](ok ? '已复制参数字符串' : '复制失败');
  };

  const importFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseBlendParamString(text, props.codes, props.params);
      if (!parsed) {
        message.error('无法解析参数字符串');
        return;
      }
      props.onImport(parsed);
      message.success('参数已导入');
    } catch {
      message.error('读取剪贴板失败');
    }
  };

  return (
    <div className={styles.box}>
      <code className={styles.code}>{str}</code>
      <div className={styles.actions}>
        <button type="button" onClick={copy}>复制参数</button>
        <button type="button" onClick={importFromClipboard}>从剪贴板导入</button>
      </div>
    </div>
  );
}
