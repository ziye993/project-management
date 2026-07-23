import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useRouterIds } from '@/Router';
import ToolPageLayout from '@/components/ToolPageLayout';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import styles from './index.module.less';

interface AppStoreLayoutContextValue {
  createRequestId: number;
  requestCreate: () => void;
  setHeaderActions: (node: ReactNode | null) => void;
}

const AppStoreLayoutContext = createContext<AppStoreLayoutContextValue>({
  createRequestId: 0,
  requestCreate: () => undefined,
  setHeaderActions: () => undefined,
});

export function useAppStoreLayout() {
  return useContext(AppStoreLayoutContext);
}

export default function AppStoreLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'apps');
  const { canWriteModule } = useAuth();
  const canWrite = canWriteModule('appStore');
  const [createRequestId, setCreateRequestId] = useState(0);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);

  const requestCreate = useCallback(() => {
    setCreateRequestId((n) => n + 1);
  }, []);

  const ctx = useMemo(
    () => ({ createRequestId, requestCreate, setHeaderActions }),
    [createRequestId, requestCreate],
  );

  const showCreate = current === 'apps' && canWrite;
  const actions = headerActions != null
    ? headerActions
    : showCreate
      ? (
        <Button onClick={requestCreate}>
          <PlusOutlined /> 新增
        </Button>
      )
      : null;

  return (
    <AppStoreLayoutContext.Provider value={ctx}>
      <ToolPageLayout
        actions={actions}
        mainClassName={styles.main}
      >
        {props.children}
      </ToolPageLayout>
    </AppStoreLayoutContext.Provider>
  );
}
