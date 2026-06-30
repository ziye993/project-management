import ToolPageLayout from '../../../compomeents/ToolPageLayout';
import PlaneEditor from '../../../compomeents/PlaneEditor';
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
