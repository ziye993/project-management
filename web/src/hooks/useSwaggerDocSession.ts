import { useEffect, useMemo, useState } from 'react';
import {
  addSwaggerHistory,
  loadSwaggerSession,
  saveSwaggerSession,
} from '@/utils/swaggerStorage';
import { buildApiDocsUrl, fetchOpenAPISpec } from '@/utils/openapi';
import { createDocTab, createTabLabel, type DocTab } from '@/type/docTab';

interface UseSwaggerDocSessionOptions {
  relabelTabs?: boolean;
}

export function useSwaggerDocSession(options: UseSwaggerDocSessionOptions = {}) {
  const [initialSession] = useState(() => loadSwaggerSession());
  const [tabs, setTabs] = useState<DocTab[]>(() => {
    const raw = initialSession?.tabs ?? [];
    if (!options.relabelTabs) return raw;
    return raw.map((tab) => ({
      ...tab,
      label: createTabLabel(tab.spec, tab.sourceUrl, tab.remark),
    }));
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(initialSession?.activeTabId ?? null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = useMemo(() => {
    if (!tabs.length) return null;
    return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  }, [tabs, activeTabId]);

  useEffect(() => {
    saveSwaggerSession(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const addTab = (
    spec: DocTab['spec'],
    sourceUrl: string,
    meta?: { baseUrl: string; group: string },
  ) => {
    const tab = createDocTab(spec, sourceUrl);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setError(null);
    if (meta) {
      addSwaggerHistory(spec, sourceUrl, meta.baseUrl, meta.group);
    }
    return tab;
  };

  const selectTab = (id: string) => {
    setActiveTabId(id);
    setError(null);
    return tabs.find((tab) => tab.id === id) ?? null;
  };

  const fetchDocument = async (
    baseUrl: string,
    group: string,
    opts?: { preferCache?: boolean },
  ) => {
    const docsUrl = buildApiDocsUrl(baseUrl, group);
    if (opts?.preferCache) {
      const cached = tabs.find((tab) => tab.sourceUrl === docsUrl);
      if (cached) {
        selectTab(cached.id);
        return cached;
      }
    }

    setFetchLoading(true);
    setError(null);
    try {
      const data = await fetchOpenAPISpec(docsUrl);
      return addTab(data, docsUrl, { baseUrl, group });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      return null;
    } finally {
      setFetchLoading(false);
    }
  };

  const closeTab = (
    id: string,
    onAfterClose?: (nextActiveId: string | null, remainingCount: number) => void,
  ) => {
    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === id);
      const next = prev.filter((tab) => tab.id !== id);
      let nextActiveId = activeTabId;

      if (id === activeTabId) {
        const newActive = next[index] ?? next[index - 1] ?? null;
        nextActiveId = newActive?.id ?? null;
        setActiveTabId(nextActiveId);
      }

      onAfterClose?.(nextActiveId, next.length);
      return next;
    });
  };

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    fetchLoading,
    error,
    setError,
    addTab,
    selectTab,
    fetchDocument,
    closeTab,
  };
}
