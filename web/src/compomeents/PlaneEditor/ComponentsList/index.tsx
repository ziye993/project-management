import styles from '../index.module.less';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import type { TConfigRef } from '../themes/types';
import type { MockDevice } from '../mock';

interface ComponentsListProps {
  componentsRef: React.RefObject<HTMLDivElement | null>;
  deviceList: MockDevice[];
  hasElement: (ele: TConfigRef | number | string) => boolean;
}

const baseItems = [
  { label: '墙', value: 'line', type: 'box' as const, eleType: 'line' as const, width: 30, height: 1500 },
  { label: '线', value: 'wall', type: 'box' as const, eleType: 'line' as const, width: 10, height: 1500 },
  { label: '通道', value: 'o', type: 'box' as const, eleType: 'line' as const, width: 150, height: 1500 },
  { label: '文字', value: 'text', type: 'text' as const, eleType: 'text' as const, width: 50, height: 50 },
];

export default function ComponentsList(props: ComponentsListProps) {
  const availableDevices = props.deviceList.filter(d => !props.hasElement(d.value));

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '设备',
      children: (
        <div className={styles.devList}>
          {availableDevices.map((device, index) => (
            <div
              key={device.value}
              className={styles.devItem}
              draggable
              data-json={JSON.stringify({
                index,
                label: device.label,
                value: device.value,
                type: 'box',
                eletype: 'dev',
              })}
            >
              {device.label}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: '2',
      label: '预设元素',
      children: (
        <div className={styles.devList}>
          {baseItems.map((item, index) => (
            <div
              key={item.value}
              className={styles.devItem}
              draggable
              data-json={JSON.stringify({
                index,
                label: item.label,
                value: item.value,
                type: item.type,
                width: item.width,
                height: item.height,
                eletype: item.eleType,
              })}
            >
              {item.label}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.componentsListBox} ref={props.componentsRef}>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
}
