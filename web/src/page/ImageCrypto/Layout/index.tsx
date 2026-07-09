import { useRouterIds } from '@/Router';
import ModuleNavLinks from '@/components/ModuleNavLinks';
import ToolPageLayout from '@/components/ToolPageLayout';
import ScrambleTab from '../Scramble';
import MirageTab from '../Mirage';
import SmartRevealTab from '../SmartReveal';
import BlendTab from '../Blend';
import styles from './index.module.less';

const NAV_ITEMS = [
  { path: '/image-crypto/scramble', label: '加解密', match: 'scramble' },
  { path: '/image-crypto/mirage', label: '隐写图', match: 'mirage' },
  { path: '/image-crypto/smart-reveal', label: '智能显形', match: 'smart-reveal' },
  { path: '/image-crypto/blend', label: '双图合并', match: 'blend' },
];

export default function ImageCryptoLayout(props: { children?: React.ReactNode }) {
  const routerIds = useRouterIds();
  const current = String(routerIds[routerIds.length - 1] || 'scramble');

  return (
    <ToolPageLayout
      actions={<ModuleNavLinks items={NAV_ITEMS} current={current} />}
      mainClassName={styles.main}
    >
      {props.children}
    </ToolPageLayout>
  );
}

export function ImageCryptoScramblePage() {
  return <ScrambleTab />;
}

export function ImageCryptoMiragePage() {
  return <MirageTab />;
}

export function ImageCryptoSmartRevealPage() {
  return <SmartRevealTab />;
}

export function ImageCryptoBlendPage() {
  return <BlendTab />;
}
