import type { RevealRound } from '../utils/smartReveal/sessionState';
import styles from './RevealHistory.module.less';

interface RevealHistoryProps {
  rounds: RevealRound[];
  currentIndex: number;
  onGoTo: (index: number) => void;
}

export default function RevealHistory(props: RevealHistoryProps) {
  return (
    <nav className={styles.nav} aria-label="显形轮次历史">
      <span className={styles.label}>轮次历史</span>
      <div className={styles.steps}>
        {props.rounds.map((round, idx) => {
          const isCurrent = idx === props.currentIndex;
          const isPast = idx < props.currentIndex;
          return (
            <button
              key={round.roundIndex}
              type="button"
              className={`${styles.step} ${isCurrent ? styles.current : ''} ${isPast ? styles.past : ''}`}
              onClick={() => props.onGoTo(idx)}
              title={round.selectedIndex !== undefined ? `已选预设 #${round.selectedIndex + 1}` : '未选择'}
            >
              <span className={styles.stepNum}>{idx + 1}</span>
              <span className={styles.stepText}>
                第 {idx + 1} 轮
                {round.selectedIndex !== undefined && (
                  <span className={styles.chosen}> · #{round.selectedIndex + 1}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
