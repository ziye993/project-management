
import { useEffect, useRef, useState } from 'react'
import styles from './index.module.less'
import {
  getProjectList,
  forceRefreshList as _forceRefreshList,
  runCom,
  stopCommand,
  getRunningList,
  getLogs,
  getColorGroups,
} from '../../../server/project';
import Left from './left';
import type { IProjectData as _IProjectData, IColorCache } from '../../../type';
import Center from './center';
import Right from './right';
import UserHeader from '../../../compomeents/UserHeader';
import Header from './header';
import ColorLegend from './colorLegend';

interface IProjectData {
  projectList: _IProjectData["projectList"],
}

export default function ProjectManage() {
  const [projectData, setProjectData] = useState<IProjectData>({ projectList: [] });
  const [colorCache, setColorCache] = useState<IColorCache | null>(null);
  const [refCount, setRefCount] = useState(1);
  const logRef = useRef<any>({});

  const projectList = projectData?.projectList?.map?.(_ => {
    return {
      ..._,
      hasRunning: _.scripts.some(__ => __.running),
      hasMask: _.scripts.some(__ => __.running !== undefined)
    }
  }) || [];
  const currentProjectIndex = projectList.findIndex(_ => _.checked);
  const currentProject = projectList?.[currentProjectIndex];
  const currentCommandIndex = currentProject?.scripts?.findIndex?.(_ => _.checked);
  const currentCommand = currentProject?.scripts?.[currentCommandIndex];
  const logs: any[] = logRef.current?.[currentProject?.value]?.[currentCommand?.value]?.logs || []
  const commandBoxRef = useRef<HTMLDivElement>(null);

  const loadColorGroups = async () => {
    const res = await getColorGroups();
    if (res?.data) setColorCache(res.data);
  };

  const init = async () => {
    const { success: projectSuccess, data: projectData } = await getProjectList();
    const { success: runningSuccess, data: runningList } = await getRunningList();
    if (runningSuccess) {
      projectData?.forEach((_: any) => {
        if (runningList?.[_?.value]) {
          _?.scripts?.forEach?.((__: any) => {
            if ((runningList?.[_.value] as string[])?.includes(__.value)) {
              __.running = true;
            }
          })
        }
      });
    }
    projectSuccess && setProjectData((prev: any) => ({ ...prev, projectList: projectData || [] }));
    const logResult = await getLogs();
    if (logResult) logRef.current = logResult.data || {};
    await loadColorGroups();
  }

  const forceRefreshList = async () => {
    const data = await _forceRefreshList();
    const listRes = await getProjectList();
    setProjectData((prev: any) => ({ ...prev, projectList: listRes.data || data.data }))
    await loadColorGroups();
  }

  const setProjectChecked = async (index: number) => {
    setProjectData(prev => {
      let nPrev = { ...prev };
      nPrev.projectList.forEach(_ => _.checked = false);
      nPrev.projectList[index].checked = true;
      return nPrev
    });
  }

  const setCommandRunning = (item: any) => {
    setProjectData(prev => {
      const nPrev = { ...prev };
      nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => {
        _.checked = _.value === item.value;
        if (_.value === item.value) {
          _.running = true;
          _.connect = true;
        }
      });
      return nPrev
    });
  }

  const setCommandChecked = async (item: any) => {
    setProjectData(prev => {
      const nPrev = { ...prev };
      nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => _.checked = _.value === item.value);
      return nPrev
    });
  }

  const runCommand = async (item: any) => {
    if (!currentProject) return;
    if (currentProject?.scripts?.find(s => s.value === item.value)?.running && item.connect) return;

    if (!logRef.current?.[currentProject?.value]) {
      logRef.current[currentProject.value] = {};
    }
    if (!logRef.current[currentProject.value][item.value]) {
      logRef.current[currentProject.value][item.value] = {
        logs: [],
        key: `${currentProject.value}:${item.value}`,
        event: undefined,
      }
    }

    logRef.current[currentProject.value][item.value].event = function (data: string | boolean) {
      if (data === true) {
        const [project, command] = (this as string).split(":");
        const idx = projectList.findIndex(_ => _.value === project);
        const cmdIdx = projectList?.[idx]?.scripts?.findIndex?.(_ => _.value === command);
        setProjectData(prev => {
          let nPrev = { ...prev };
          if (cmdIdx !== undefined && cmdIdx > -1) {
            nPrev.projectList[idx].scripts[cmdIdx].running = false;
          }
          return nPrev;
        })
        setRefCount(prev => prev <= 10000 ? prev + 1 : 1);
        return
      }
      let text = (data as string).replace(/^\r?\n|\r?\n$/g, '');
      const error = text.includes('[[E]]');
      if (error) text = text.slice(5);
      logRef.current[currentProject?.value][item.value].logs.push({ text, type: error ? 'error' : undefined });
      setRefCount(prev => prev <= 10000 ? prev + 1 : 1);
    }

    runCom({
      ...item,
      project: currentProject.value,
      path: currentProject?.path
    },
      logRef.current[currentProject.value][item.value].event.bind(`${currentProject.value}:${item.value}`)
    );
    setCommandRunning(item);
  }

  const stop = async (item: any) => {
    const data = await stopCommand({
      ...item,
      project: currentProject.value,
      path: currentProject?.path
    });
    if (!data.success) return;
    setProjectData(prev => {
      const nPrev = { ...prev };
      nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => {
        if (_.value === item.value) {
          _.running = false;
          _.checked = false
        }
      });
      return nPrev
    });
  }

  const close = async (item: any) => {
    if (item.running) {
      const data = await stopCommand({
        ...item,
        project: currentProject.value,
        path: currentProject?.path
      });
      if (!data.success) return;
    }
    setProjectData(prev => {
      const nPrev = { ...prev };
      nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => {
        if (_.value === item.value) {
          _.running = undefined;
          _.checked = false
        }
      });
      return nPrev
    });
    logRef.current[currentProject?.value][item.value] = undefined;
    setRefCount(prev => prev + 1)
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (commandBoxRef.current) {
      const el = commandBoxRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [refCount])

  return <div className={styles.box}>
    <UserHeader className={styles.userHeader}>
      <Header forceRefreshList={forceRefreshList} onColorRefresh={loadColorGroups} />
    </UserHeader>
    <div className={styles.contentBox}>
      <Left projectList={projectList} setProjectChecked={setProjectChecked} onProjectRemoved={init} />
      <Center commandBoxRef={commandBoxRef} currentCommand={currentCommand} currentProject={currentProject} refCount={refCount} logs={logs} runCommand={runCommand} />
      <Right currentProject={currentProject} setCommandChecked={setCommandChecked} runCommand={runCommand} close={close} stop={stop} />
      <ColorLegend colorCache={colorCache} />
    </div>
  </div>
}
