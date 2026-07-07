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
} from '@/api/project';
import { getConfig } from '@/api/setConfig';
import Left from './left';
import type { IProjectData as _IProjectData, IColorCache } from '../../../type';
import Center from './center';
import Right from './right';
import ToolPageLayout from '@/components/ToolPageLayout';
import Header from './header';
import ColorLegend from './colorLegend';
import { makeRunKey, parseRunKey } from '../../../utils/runKey';
import {
  customCommandValue,
  isCustomCommandValue,
  type CustomProjectCommand,
} from '../../../constants/customCommands';

interface IProjectData {
  projectList: _IProjectData["projectList"],
}

type CustomRunState = {
  running?: boolean;
  connect?: boolean;
  checked?: boolean;
};

export default function ProjectManage() {
  const [projectData, setProjectData] = useState<IProjectData>({ projectList: [] });
  const [colorCache, setColorCache] = useState<IColorCache | null>(null);
  const [customCommands, setCustomCommands] = useState<CustomProjectCommand[]>([]);
  const [customRunMap, setCustomRunMap] = useState<Record<string, Record<string, CustomRunState>>>({});
  const [refCount, setRefCount] = useState(1);
  const logRef = useRef<any>({});

  const projectList = projectData?.projectList || [];
  const currentProjectIndex = projectList.findIndex(_ => _.checked);
  const currentProject = projectList?.[currentProjectIndex];
  const currentScript = currentProject?.scripts?.find?.(_ => _.checked);
  const currentCustomRun = currentProject?.path ? customRunMap[currentProject.path] || {} : {};
  const activeCustomEntry = Object.entries(currentCustomRun).find(([, state]) => state.checked);
  const activeCustomId = activeCustomEntry?.[0];
  const activeCustomCommand = activeCustomId
    ? customCommands.find(cmd => customCommandValue(cmd.id) === activeCustomId)
    : undefined;
  const currentCommand = currentScript || (activeCustomCommand ? {
    label: activeCustomCommand.title,
    value: customCommandValue(activeCustomCommand.id),
    command: activeCustomCommand.command,
  } : null);
  const logs: any[] = currentCommand?.value
    ? logRef.current?.[currentProject?.path]?.[currentCommand.value]?.logs || []
    : [];
  const commandBoxRef = useRef<HTMLDivElement>(null);

  const updateCustomRunState = (projectPath: string, value: string, patch: Partial<CustomRunState>) => {
    setCustomRunMap(prev => ({
      ...prev,
      [projectPath]: {
        ...(prev[projectPath] || {}),
        [value]: {
          ...(prev[projectPath]?.[value] || {}),
          ...patch,
        },
      },
    }));
  };

  const clearCustomChecked = (projectPath?: string) => {
    if (!projectPath) return;
    setCustomRunMap(prev => {
      const projectState = prev[projectPath];
      if (!projectState) return prev;
      const nextProjectState = Object.fromEntries(
        Object.entries(projectState).map(([key, state]) => [key, { ...state, checked: false }]),
      );
      return { ...prev, [projectPath]: nextProjectState };
    });
  };

  const loadCustomCommands = async () => {
    const res = await getConfig();
    if (res?.data?.customProjectCommands) {
      setCustomCommands(res.data.customProjectCommands);
    } else {
      setCustomCommands([]);
    }
  };

  const loadColorGroups = async () => {
    const res = await getColorGroups();
    if (res?.data) setColorCache(res.data);
  };

  const syncCustomRunningState = (runningList: Record<string, string[]>) => {
    setCustomRunMap(prev => {
      const next = { ...prev };
      Object.entries(runningList || {}).forEach(([projectPath, commands]) => {
        commands.forEach(command => {
          if (!isCustomCommandValue(command)) return;
          next[projectPath] = next[projectPath] || {};
          next[projectPath][command] = {
            ...(next[projectPath][command] || {}),
            running: true,
            connect: false,
          };
        });
      });
      return next;
    });
  };

  const init = async () => {
    await loadCustomCommands();
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
      syncCustomRunningState(runningList);
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
        Object.keys(projectLogs).forEach((commandValue) => {
          if (!isCustomCommandValue(commandValue)) return;
          const hasLogs = projectLogs[commandValue]?.logs?.length;
          if (!hasLogs) return;
          const running = runningList?.[project.path]?.includes(commandValue);
          setCustomRunMap(prev => ({
            ...prev,
            [project.path]: {
              ...(prev[project.path] || {}),
              [commandValue]: {
                ...(prev[project.path]?.[commandValue] || {}),
                running: running ? true : false,
                connect: false,
              },
            },
          }));
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
    clearCustomChecked(currentProject?.path);
  }

  const setCommandChecked = async (item: any) => {
    if (isCustomCommandValue(item.value)) {
      if (!currentProject?.path) return;
      setProjectData(prev => {
        const nPrev = { ...prev };
        nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => _.checked = false);
        return nPrev;
      });
      clearCustomChecked(currentProject.path);
      updateCustomRunState(currentProject.path, item.value, { checked: true });
      return;
    }
    setProjectData(prev => {
      const nPrev = { ...prev };
      nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => _.checked = _.value === item.value);
      return nPrev
    });
    clearCustomChecked(currentProject?.path);
  }

  const executeCommand = async (item: { value: string; label?: string; command?: string; reconnect?: boolean }, options?: { isCustom?: boolean }) => {
    if (!currentProject) return;
    const isReconnect = item.reconnect === true;
    const script = currentProject.scripts?.find(s => s.value === item.value);
    const customState = currentCustomRun[item.value];
    const isRunning = options?.isCustom ? customState?.running : script?.running;
    const isConnected = options?.isCustom ? customState?.connect : script?.connect;
    if (isRunning && isConnected && !isReconnect) return;

    const runKey = makeRunKey(currentProject.path, item.value);
    if (isReconnect || (isRunning && !isConnected)) {
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
          if (isCustomCommandValue(command)) {
            updateCustomRunState(projectPath, command, {
              running: !!stillRunning,
              connect: false,
              checked: true,
            });
          } else {
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
          }
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

    if (options?.isCustom) {
      setProjectData(prev => {
        const nPrev = { ...prev };
        nPrev.projectList[currentProjectIndex].scripts?.forEach(_ => _.checked = false);
        return nPrev;
      });
      clearCustomChecked(currentProject.path);
      updateCustomRunState(currentProject.path, item.value, { checked: true, running: true, connect: true });
      return;
    }
    setCommandRunning(item);
  }

  const runCommand = async (item: any) => {
    await executeCommand(item, { isCustom: isCustomCommandValue(item.value) });
  }

  const runCustomCommand = async (cmd: CustomProjectCommand) => {
    await executeCommand({
      value: customCommandValue(cmd.id),
      label: cmd.title,
      command: cmd.command,
    }, { isCustom: true });
  }

  const reconnectCommand = (item: any) => {
    executeCommand({ ...item, reconnect: true }, { isCustom: isCustomCommandValue(item.value) });
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
    if (isCustomCommandValue(item.value)) {
      updateCustomRunState(currentProject.path, item.value, { running: false, checked: false, connect: false });
      return;
    }
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
    if (isCustomCommandValue(item.value)) {
      updateCustomRunState(currentProject.path, item.value, { running: undefined, checked: false, connect: false });
    } else {
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
    }
    setRefCount(prev => prev + 1);
    if (logRef.current?.[currentProject?.path]?.[item.value]) {
      logRef.current[currentProject.path][item.value].logs = [];
    }
  }

  const customRunningItems = Object.entries(currentCustomRun)
    .filter(([, state]) => state.running !== undefined)
    .map(([value, state]) => {
      const cmd = customCommands.find(item => customCommandValue(item.id) === value);
      return {
        label: cmd?.title || value,
        value,
        command: cmd?.command,
        running: state.running,
        connect: state.connect,
        checked: state.checked,
      };
    });

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (commandBoxRef.current) {
      const el = commandBoxRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [refCount])

  return (
    <ToolPageLayout className={styles.box} actions={<Header forceRefreshList={forceRefreshList} onColorRefresh={loadColorGroups} />} mainClassName={styles.contentBox}>
        <Left projectList={projectList} setProjectChecked={setProjectChecked} onProjectRemoved={init} />
        <Center
          commandBoxRef={commandBoxRef}
          currentCommand={currentCommand}
          currentProject={currentProject}
          customCommands={customCommands}
          customRunState={currentCustomRun}
          refCount={refCount}
          logs={logs}
          runCommand={runCommand}
          runCustomCommand={runCustomCommand}
        />
        <div className={styles.sideColumn}>
          <Right
            currentProject={currentProject}
            customRunningItems={customRunningItems}
            setCommandChecked={setCommandChecked}
            runCommand={runCommand}
            reconnectCommand={reconnectCommand}
            close={close}
            stop={stop}
          />
          <ColorLegend colorCache={colorCache} />
        </div>
    </ToolPageLayout>
  );
}
