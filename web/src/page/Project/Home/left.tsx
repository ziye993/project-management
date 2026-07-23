import type { IProjectListItem, IProjectScript } from '../../../type';
import styles from './index.module.less';
import { DeleteOutlined } from '@ant-design/icons';
import { removeProject } from '@/api/project';
import message from '@/components/ui/Modal/message';
import { softenRowColor } from '../../../utils/color';

type CustomRunState = {
	running?: boolean;
	connect?: boolean;
	checked?: boolean;
};

interface IProps {
	projectList: IProjectListItem[];
	customRunMap?: Record<string, Record<string, CustomRunState>>;
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

function hasInstructions(
	item: IProjectListItem,
	customRunMap: Record<string, Record<string, CustomRunState>>,
) {
	if (item.scripts?.some(s => s.running !== undefined)) return true;
	const custom = customRunMap[item.path];
	if (!custom) return false;
	return Object.values(custom).some(s => s.running !== undefined);
}

export default function Left(props: IProps) {
	const { projectList, customRunMap = {}, setProjectChecked, onProjectRemoved } = props;

	const handleRemove = async (e: React.MouseEvent, item: IProjectListItem) => {
		e.stopPropagation();
		await removeProject(item.path);
		message.success('已移除项目');
		onProjectRemoved();
	};

	const indexedList = projectList.map((item, index) => ({ item, index }));
	const runningProjects = indexedList.filter(({ item }) => hasInstructions(item, customRunMap));
	const otherProjects = indexedList.filter(({ item }) => !hasInstructions(item, customRunMap));

	const renderProject = (item: IProjectListItem, index: number) => (
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

	return (
		<div className={`${styles.list} ${styles.projectPanel}`}>
			{runningProjects.length > 0 && (
				<>
					<p className={styles.sectionLabel}>运行中</p>
					{runningProjects.map(({ item, index }) => renderProject(item, index))}
				</>
			)}
			{(otherProjects.length > 0 || runningProjects.length === 0) && (
				<>
					<p className={styles.sectionLabel}>项目列表</p>
					{otherProjects.map(({ item, index }) => renderProject(item, index))}
				</>
			)}
		</div>
	)
}
