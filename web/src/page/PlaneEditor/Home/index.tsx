import ToolPageLayout from '@/components/ToolPageLayout';
import PlaneEditor from '@/components/PlaneEditor';
import styles from './index.module.less';

export default function PlaneEditorHome() {
  return (
    <ToolPageLayout>
      <div className={styles.editorWrap}>
        <PlaneEditor />
      </div>
    </ToolPageLayout>
  );
}
