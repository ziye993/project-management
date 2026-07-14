import { useRouterIds } from '@/Router';
import ModuleNavLinks from '@/components/ModuleNavLinks';
import ToolPageLayout from '@/components/ToolPageLayout';
import CalcUtilityPage from '../Utility';
import CalcOtherPage from '../Other';
import styles from './index.module.less';

const NAV_ITEMS = [
  { path: '/calc/utility', label: '水电费计算', match: 'utility' },
  { path: '/calc/other', label: '其他计算', match: 'other' },
];

export default function CalcLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'utility');

  return (
    <ToolPageLayout
      actions={<ModuleNavLinks items={NAV_ITEMS} current={current} />}
      mainClassName={styles.main}
    >
      {props.children}
    </ToolPageLayout>
  );
}

export function CalcUtilityRoutePage() {
  return <CalcUtilityPage />;
}

export function CalcOtherRoutePage() {
  return <CalcOtherPage />;
}
