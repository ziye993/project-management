import { shellStyles } from '@/components/ToolPageLayout';
import styles from './index.module.less';

export default function CalcOtherPage() {
  return (
    <div className={styles.page}>
      <section className={`${shellStyles.panel} ${styles.section}`}>
        <h3 className={shellStyles.panelTitle}>其他计算</h3>
        <p className={styles.hint}>占位页，后续可在此扩展更多计算工具。</p>
      </section>
    </div>
  );
}
