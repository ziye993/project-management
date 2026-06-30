import type { DocTab } from '../../type/docTab';
import type { SwaggerHistoryEntry } from '../../utils/swaggerStorage';
import { UrlForm } from '../../page/swagger/home/UrlForm';
import { DocTabs } from '../../page/swagger/home/DocTabs';
import styles from './index.module.less';

interface SwaggerDocToolbarProps {
  showForm: boolean;
  tabs: DocTab[];
  activeTabId: string | null;
  fetchLoading: boolean;
  history: SwaggerHistoryEntry[];
  onFetch: (baseUrl: string, group: string) => void | Promise<void>;
  onPaste: (json: string) => void;
  onHistorySelect: (entry: SwaggerHistoryEntry) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onToggleForm: () => void;
}

export default function SwaggerDocToolbar(props: SwaggerDocToolbarProps) {
  const { showForm, tabs, activeTabId, fetchLoading, history } = props;

  return (
    <>
      {showForm && (
        <UrlForm
          onFetch={props.onFetch}
          onPaste={props.onPaste}
          loading={fetchLoading}
          compact={tabs.length > 0}
          history={history}
          onHistorySelect={props.onHistorySelect}
        />
      )}
      {tabs.length > 0 && activeTabId && (
        <DocTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={props.onSelectTab}
          onClose={props.onCloseTab}
          onAdd={props.onAddTab}
        />
      )}
      {tabs.length > 0 && (
        <button
          type="button"
          className={styles.formToggleBtn}
          onClick={props.onToggleForm}
        >
          {showForm ? '收起' : '加载文档'}
        </button>
      )}
    </>
  );
}
