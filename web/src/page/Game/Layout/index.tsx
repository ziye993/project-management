import { useNavigate, useRouterIds } from '../../../Router';
import Button from '../../../UiComponents/Button';
import ToolPageLayout from '../../../compomeents/ToolPageLayout';
import { GameLayoutActionsProvider, useGameLayoutActions } from '../context/layoutActions';

function GameLayoutInner(props: { children?: React.ReactNode }) {
  const { push } = useNavigate();
  const routerIds = useRouterIds();
  const { actions } = useGameLayoutActions();
  const inGame = routerIds.includes('sudoku') || routerIds.includes('gomoku');

  return (
    <ToolPageLayout
      actions={
        <>
          {inGame && (
            <Button onClick={() => push('/game/home')}>游戏列表</Button>
          )}
          {actions}
        </>
      }
    >
      {props.children}
    </ToolPageLayout>
  );
}

export default function GameLayout(props: { children?: React.ReactNode }) {
  return (
    <GameLayoutActionsProvider>
      <GameLayoutInner>{props.children}</GameLayoutInner>
    </GameLayoutActionsProvider>
  );
}
