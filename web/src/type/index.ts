
export interface IProjectScript {
    label: string;
    value: string;
    command?: string;
    checked?: boolean;
    running?: boolean;
    runningId?: string | number;
    connect?: boolean;
    sortIndex?: number;
}

export interface IProjectListItem {
    label: string;
    value: string;
    path: string;
    parentPath?: string;
    importType?: 'workspace' | 'project';
    color?: string;
    groupPath?: string;
    hasRunning?: boolean;
    hasMask?: boolean;
    scripts: IProjectScript[];
    checked?: boolean;
}

export interface IColorGroup {
    parentPath: string;
    color: string;
    projects: { label: string; value: string; path: string }[];
}

export interface IColorCache {
    lastRefreshedAt: string | null;
    groups: IColorGroup[];
}

export interface IProjectData {
    projectList: IProjectListItem[];
}
