import { useEffect, useState } from 'react';
import { getConfig } from '@/api/setConfig';
import type { MockFieldDefaults } from '@/type/mockDefaults';
import {
  isFetchableSourceUrl,
  parseApiDocsUrl,
} from '@/utils/openapi';
import {
  addSwaggerHistory,
} from '@/utils/swaggerStorage';
import { fetchOpenAPISpec } from '@/utils/openapi';
import { ApiDocViewer } from './ApiDocViewer';
import { createTabLabel } from '@/type/docTab';
import styles from './index.module.less';
import ToolPageLayout from '@/components/ToolPageLayout';
import SwaggerDocToolbar from '@/components/SwaggerDocToolbar';
import { useSwaggerDocSession } from '@/hooks/useSwaggerDocSession';

function Swagger() {
  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    fetchLoading,
    error,
    setError,
    fetchDocument,
    closeTab,
  } = useSwaggerDocSession({ relabelTabs: true });
  const [refreshingTabId, setRefreshingTabId] = useState<string | null>(null);
  const [fieldDefaults, setFieldDefaults] = useState<MockFieldDefaults | null>(null);

  useEffect(() => {
    void getConfig().then((res) => {
      if (res?.data?.mockFieldDefaults) {
        setFieldDefaults(res.data.mockFieldDefaults);
      }
    });
  }, []);

  const handleFetch = async (baseUrl: string, group: string) => {
    await fetchDocument(baseUrl, group);
  };

  const handleRefreshTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || !isFetchableSourceUrl(tab.sourceUrl)) return;

    setRefreshingTabId(tabId);
    setError(null);

    try {
      const data = await fetchOpenAPISpec(tab.sourceUrl);
      const label = createTabLabel(data, tab.sourceUrl, tab.remark);
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, spec: data, label } : t)),
      );

      const parsed = parseApiDocsUrl(tab.sourceUrl);
      if (parsed) {
        addSwaggerHistory(data, tab.sourceUrl, parsed.baseUrl, parsed.group);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshingTabId(null);
    }
  };

  const handleCookieChange = (tabId: string, cookie: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, cookie } : t)));
  };

  const handleRemarkChange = (tabId: string, remark: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              remark: remark || undefined,
              label: createTabLabel(t.spec, t.sourceUrl, remark),
            }
          : t,
      ),
    );
  };

  const showWelcome = tabs.length === 0 && !fetchLoading;

  return (
    <ToolPageLayout
      actions={(
        <SwaggerDocToolbar
          tabs={tabs}
          activeTabId={activeTabId}
          fetchLoading={fetchLoading}
          onFetch={handleFetch}
          onSelectTab={setActiveTabId}
          onCloseTab={closeTab}
        />
      )}
    >
      <div className={styles.pageBody}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <strong>加载失败：</strong>
            {error}
          </div>
        )}

        <div className={styles.docPanel}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={styles.docPanelItem}
              hidden={tab.id !== activeTabId}
            >
              <ApiDocViewer
                spec={tab.spec}
                sourceUrl={tab.sourceUrl}
                remark={tab.remark ?? ''}
                onRemarkChange={(remark) => handleRemarkChange(tab.id, remark)}
                cookie={tab.cookie ?? ''}
                onCookieChange={(cookie) => handleCookieChange(tab.id, cookie)}
                fieldDefaults={fieldDefaults}
                canRefresh={isFetchableSourceUrl(tab.sourceUrl)}
                refreshing={refreshingTabId === tab.id}
                onRefresh={() => void handleRefreshTab(tab.id)}
              />
            </div>
          ))}

          {showWelcome && !error && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📄</div>
              <p>点击右上角「加载文档」，输入服务地址后开始</p>
              <p className={styles.emptyHint}>
                将自动请求 <code>{'{baseUrl}/v3/api-docs/{分组}'}</code> 接口
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}

export default Swagger;
