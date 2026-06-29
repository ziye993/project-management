import PageShell from '../../../compomeents/PageShell';
import PageHeader from '../../../compomeents/PageHeader';
import PlaneEditor from '../../../compomeents/PlaneEditor';
import styles from './index.module.less';

export default function PlaneEditorHome() {
  return (
    <PageShell>
      <PageHeader />
      <div className={styles.editorWrap}>
        <PlaneEditor />
      </div>
    </PageShell>
  );
}
