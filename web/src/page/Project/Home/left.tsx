import type { IProjectListItem } from '../../../type';
import styles from './index.module.less';
import { DeleteOutlined } from '@ant-design/icons';
import { removeProject } from '../../../server/project';
import message from '../../../UiComponents/Modal/message';

interface IProps {
	projectList: IProjectListItem[];
	setProjectChecked: (index: number) => void;
	onProjectRemoved: () => void;
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
		<div className={styles.list}>
			<p>项目列表</p>
			{projectList.map((item, index) => {
				return (
					<div
						key={item.path}
						className={`${styles.itemBox} ${item.checked ? styles.checkedItem : ''}`}
						style={{ backgroundColor: item.color || undefined }}
						onClick={() => { setProjectChecked(index) }}
					>
						<span className={`
              ${styles.hasRunningicon} 
              ${item.hasMask ? (item.hasRunning
								? styles.hasRunning : styles.maskHasPause) : styles.noMask}
              `}></span>
						<span className={styles.projectItemName}>{item.label}</span>
						<span className={styles.path} title={item.path}>{item.path}</span>
						<DeleteOutlined className={styles.removeBtn} onClick={(e) => handleRemove(e, item)} />
					</div>
				);
			})}
		</div>
	)
}
