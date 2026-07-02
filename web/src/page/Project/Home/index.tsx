
import { useEffect, useRef, useState } from 'react'
import styles from './index.module.less'
import {
  getProjectList,
  forceRefreshList as _forceRefreshList,
  runCom,
  stopCommand,
  closeCommand,
  getRunningList,
  getLogs,
  getColorGroups,
} from '../../../server/project';
import Left from './left';
import type { IProjectData as _IProjectData, IColorCache } from '../../../type';
import Center from './center';
import Right from './right';
import PageShell, { shellStyles } from '../../../compomeents/PageShell';
import UserHeader from '../../../compomeents/UserHeader';
import Header from './header';
import ColorLegend from './colorLegend';
import { makeRunKey, parseRunKey } from '../../../utils/runKey';

interface IProjectData {
  projectList: _IProjectData["projectList"],
}

export default function ProjectManage() {
  const [projectData, setProjectData] = useState<IProjectData>({ projectList: [] });
  const [colorCache, setColorCache] = useState<IColorCache | null>(null);
  const [refCount, setRefCount] = useState(1);
  const logRef = useRef<any>({});

  const projectList = projectData?.projectList || [];
  const currentProjectIndex = projectList.findIndex(_ => _.checked);
  const currentProject = projectList?.[currentProjectIndex];
  const currentCommandIndex = currentProject?.scripts?.findIndex?.(_ => _.checked);
  const currentCommand = currentProject?.scripts?.[currentCommandIndex];
  const logs: any[] = logRef.current?.[currentProject?.path]?.[currentCommand?.value]?.logs || []
  const commandBoxRef = useRef<HTMLDivElement>(null);

  const loadColorGroups = async () => {
    const res = await getColorGroups();
    if (res?.data) setColorCache(res.data);
  };

  const init = async () => {
    const { success: projectSuccess, data: projectData } = await getProjectList();
    const { success: runningSuccess, data: runningList } = await getRunningList();
    if (runningSuccess && projectData) {
      projectData.forEach((_: any) => {
        if (runningList?.[_?.path]) {
          _?.scripts?.forEach?.((__: any) => {
            if ((runningList?.[_.path] as string[])?.includes(__.value)) {
              __.running = true;
              __.connect = false;
            }
          })
        }
      });
    }
    const logResult = await getLogs();
    if (logResult?.data) {
      logRef.current = logResult.data;
      projectData?.forEach((project: any) => {
        const projectLogs = logRef.current[project.path];
        if (!projectLogs) return;
        project.scripts?.forEach((script: any) => {
          if (projectLogs[script.value]?.logs?.length && script.running !== true) {
            script.running = false;
          }
        });
      });
    }
    if (projectSuccess) {
      setProjectData({ projectList: projectData || [] });
    }
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
    const isReconnect = item.reconnect === true;
    const script = currentProject.scripts?.find(s => s.value === item.value);
    if (script?.running && script?.connect && !isReconnect) return;

    const runKey = makeRunKey(currentProject.path, item.value);
    if (isReconnect || (script?.running && !script?.connect)) {
      const logResult = await getLogs();
      const serverLogs = logResult?.data?.[currentProject.path]?.[item.value]?.logs || [];
      logRef.current[currentProject.path] = logRef.current[currentProject.path] || {};
      logRef.current[currentProject.path][item.value] = {
        logs: [...serverLogs],
        key: runKey,
        event: undefined,
      };
    }
    if (!logRef.current?.[currentProject.path]) {
      logRef.current[currentProject.path] = {};
    }
    if (!logRef.current[currentProject.path][item.value]) {
      logRef.current[currentProject.path][item.value] = {
        logs: [],
        key: runKey,
        event: undefined,
      };
    }

    logRef.current[currentProject.path][item.value].event = function (data: string | boolean) {
      if (data === true) {
        const { projectPath, command } = parseRunKey(this as string);
        getRunningList().then(({ data: runningList }) => {
          const stillRunning = runningList?.[projectPath]?.includes(command);
          setProjectData(prev => {
            const nPrev = { ...prev };
            const idx = nPrev.projectList.findIndex(_ => _.path === projectPath);
            const cmdIdx = nPrev.projectList[idx]?.scripts?.findIndex?.(_ => _.value === command);
            if (idx > -1 && cmdIdx !== undefined && cmdIdx > -1) {
              if (stillRunning) {
                nPrev.projectList[idx].scripts[cmdIdx].running = true;
                nPrev.projectList[idx].scripts[cmdIdx].connect = false;
              } else {
                nPrev.projectList[idx].scripts[cmdIdx].running = false;
                nPrev.projectList[idx].scripts[cmdIdx].connect = false;
              }
            }
            return nPrev;
          });
          setRefCount(prev => prev <= 10000 ? prev + 1 : 1);
        });
        return
      }
      let text = (data as string).replace(/^\r?\n|\r?\n$/g, '');
      const error = text.includes('[[E]]');
      if (error) text = text.slice(5);
      logRef.current[currentProject.path][item.value].logs.push({ text, type: error ? 'error' : undefined });
      setRefCount(prev => prev <= 10000 ? prev + 1 : 1);
    }

    runCom({
      ...item,
      path: currentProject.path,
    },
      logRef.current[currentProject.path][item.value].event.bind(runKey)
    );
    setCommandRunning(item);
  }

  const reconnectCommand = (item: any) => {
    runCommand({ ...item, reconnect: true });
  }

  const stop = async (item: any) => {
    const data = await stopCommand({
      ...item,
      path: currentProject.path,
    });
    if (!data.success) return;
    if (logRef.current?.[currentProject?.path]?.[item.value]) {
      logRef.current[currentProject.path][item.value].logs.push({ text: '\n⏹ 已暂停', type: 'error' });
    }
    setRefCount(prev => prev + 1);
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
    const data = await closeCommand({
      ...item,
      path: currentProject.path,
    });
    if (!data.success) return;
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
    setRefCount(prev => prev + 1);
    if (logRef.current?.[currentProject?.path]?.[item.value]) {
      logRef.current[currentProject.path][item.value].logs = [];
    }
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

  return <PageShell className={styles.box}>
      <UserHeader className={shellStyles.userHeader}>
        <Header forceRefreshList={forceRefreshList} onColorRefresh={loadColorGroups} />
      </UserHeader>
      <div className={styles.contentBox}>
        <Left projectList={projectList} setProjectChecked={setProjectChecked} onProjectRemoved={init} />
        <Center commandBoxRef={commandBoxRef} currentCommand={currentCommand} currentProject={currentProject} refCount={refCount} logs={logs} runCommand={runCommand} />
        <div className={styles.sideColumn}>
          <Right currentProject={currentProject} setCommandChecked={setCommandChecked} runCommand={runCommand} reconnectCommand={reconnectCommand} close={close} stop={stop} />
          <ColorLegend colorCache={colorCache} />
        </div>
      </div>
  </PageShell>
}
