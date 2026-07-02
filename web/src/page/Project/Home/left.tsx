import type { IProjectListItem, IProjectScript } from '../../../type';
import styles from './index.module.less';
import { DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { removeProject } from '@/api/project';
import message from '@/components/ui/Modal/message';
import { softenRowColor } from '../../../utils/color';

interface IProps {
	projectList: IProjectListItem[];
	setProjectChecked: (index: number) => void;
	onProjectRemoved: () => void;
}

function RunningDots({ scripts }: { scripts: IProjectScript[] }) {
	const activeScripts = scripts.filter(s => s.running !== undefined).slice(0, 3);
	if (activeScripts.length === 0) return null;

	return (
		<span className={styles.runningDots} aria-hidden>
			{activeScripts.map(script => (
				<span
					key={script.value}
					className={`${styles.runningDot} ${script.running ? styles.dotRunning : styles.dotPaused}`}
				/>
			))}
		</span>
	);
}

export default function Left(props: IProps) {
	const { projectList, setProjectChecked, onProjectRemoved } = props;

	const handleRemove = async (e: React.MouseEvent, item: IProjectListItem) => {
		e.stopPropagation();
		await removeProject(item.path);
		message.success('已移除项目');
		onProjectRemoved();
	};

	return (
		<div className={`${styles.list} ${styles.projectPanel}`}>
			<p className={styles.panelTitle}><AppstoreOutlined /> 项目列表</p>
			{projectList.map((item, index) => {
				return (
					<div
						key={item.path}
						className={`${styles.itemBox} ${item.checked ? styles.checkedItem : ''}`}
						style={{
							'--row-accent': item.color || '#e2e8f0',
							backgroundColor: item.color ? softenRowColor(item.color, 24) : undefined,
						} as React.CSSProperties}
						onClick={() => { setProjectChecked(index) }}
						title={item.path}
					>
						<span className={styles.projectItemName}>{item.label}</span>
						<div className={styles.itemActions}>
							<DeleteOutlined className={styles.removeBtn} onClick={(e) => handleRemove(e, item)} />
							<RunningDots scripts={item.scripts} />
						</div>
					</div>
				);
			})}
		</div>
	)
}
