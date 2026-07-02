import PageShell, { shellStyles } from '../PageShell';
import UserHeader from '../UserHeader';
import PageHeader from '../PageHeader';
import layoutStyles from './index.module.less';

interface ToolPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  mainClassName?: string;
  homePath?: string;
}

export default function ToolPageLayout(props: ToolPageLayoutProps) {
  const mainClass = props.mainClassName ?? layoutStyles.main;
  return (
    <PageShell className={props.className}>
      <UserHeader className={shellStyles.userHeader} actions={props.headerActions}>
        <PageHeader homePath={props.homePath}>{props.actions}</PageHeader>
      </UserHeader>
      <div className={mainClass}>{props.children}</div>
    </PageShell>
  );
}

export { shellStyles, layoutStyles };
