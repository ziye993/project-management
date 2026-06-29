import styles from '../index.module.less';
import { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { Input, Select, Space, Button, Form, InputNumber, ColorPicker } from 'antd';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import type { TConfigRef } from '../themes/types';
import { EViewDatatype } from '../themes/types';
import { getMockStationsForDevice } from '../mock';
import type { MockStation } from '../mock';

export interface ElementConfigExtra {
  title?: string;
  key?: string;
}

export type ElementConfig = TConfigRef<ElementConfigExtra>;

interface DevSettingProps {
  currentConfig?: ElementConfig | null;
  draggableRef?: React.RefObject<HTMLDivElement | null>;
  onChange?: (values: ElementConfig) => void;
  deleteElement?: (config: ElementConfig) => boolean;
  hasElement: (ele: TConfigRef | number | string) => boolean;
  getConfig: (type: EViewDatatype) => TConfigRef[];
}

const FormItem = Form.Item;

function DevSetting(props: DevSettingProps, ref: React.Ref<{ update: (ele: ElementConfig) => void }>) {
  const { currentConfig, deleteElement } = props;
  const [form] = Form.useForm();
  const [stations, setStations] = useState<MockStation[]>([]);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fillForm = (config?: ElementConfig | null) => {
    const {
      texts = [],
      position = {},
      width,
      height,
      content,
      id,
      type = 'text',
      background,
      parentId,
    } = (config ?? currentConfig) || {};

    form.setFieldsValue({
      x: position?.x,
      y: position?.y,
      width,
      height,
      content,
      id,
      background,
      type,
      parentId,
      textsContent: texts?.[0]?.content,
      textX: texts?.[0]?.position?.x,
      textY: texts?.[0]?.position?.y,
    });

    if (!config?.key && !currentConfig?.key) {
      setStations([]);
      return;
    }
    const list = getMockStationsForDevice(currentConfig?.key);
    setStations(list.filter(s => !props.hasElement(s.siteName)));
  };

  useEffect(() => {
    fillForm(currentConfig);
  }, [currentConfig]);

  useImperativeHandle(ref, () => ({
    update: (ele: ElementConfig) => {
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => fillForm(ele), 300);
    },
  }));

  return (
    <div
      className={`${styles.devSettingBox} ${collapsed ? styles.devSettingClose : ''}`}
      style={{ right: currentConfig ? '20px' : '-500px' }}
    >
      <div className={styles.openIcon} onClick={() => setCollapsed(v => !v)}>
        {collapsed ? <SettingOutlined /> : <CloseOutlined />}
      </div>
      <Form
        form={form}
        onValuesChange={(_, values) => {
          if (!currentConfig) return;
          const { textX, textY, width, height, x, y, textsContent, content, background, parentId } = values;
          props.onChange?.({
            ...currentConfig,
            content,
            width,
            height,
            parentId,
            position: { ...currentConfig.position, x, y },
            background:
              typeof background === 'string'
                ? background
                : `rgb(${background?.metaColor?.r},${background?.metaColor?.g},${background?.metaColor?.b})`,
            texts: [
              {
                parentId: currentConfig.id,
                index: 0,
                id: `${currentConfig.id}-t0`,
                type: 'text',
                size: 14,
                position: { x: textX, y: textY },
                content: textsContent,
              },
            ],
          } as ElementConfig);
        }}
      >
        <h3 className={styles.title}>基础配置</h3>
        <FormItem label="标识">
          <Input readOnly value={currentConfig?.key || ''} disabled />
        </FormItem>
        <FormItem label="标题" name="content">
          <Input />
        </FormItem>
        <Space>
          <FormItem label="长" name="width">
            <InputNumber />
          </FormItem>
          <FormItem label="宽" name="height">
            <InputNumber />
          </FormItem>
        </Space>
        <Space>
          <FormItem label="坐标X" name="x">
            <InputNumber />
          </FormItem>
          <FormItem label="坐标Y" name="y">
            <InputNumber />
          </FormItem>
        </Space>
        <FormItem label="背景色" name="background">
          <ColorPicker defaultFormat="rgb" format="rgb" />
        </FormItem>
        <FormItem label="父级" name="parentId">
          <Select
            popupMatchSelectWidth={false}
            allowClear
            options={
              props
                .getConfig(EViewDatatype.INS)
                .filter(c => c.id !== currentConfig?.id)
                .map(c => ({
                  label: (
                    <p className={styles.labelBox}>
                      <span className={styles.labelContent}>{c.content}</span>
                      <span className={styles.labelKey}>代码:{c.key}</span>
                    </p>
                  ),
                  value: c.id,
                })) || []
            }
          />
        </FormItem>

        {currentConfig?.type === 'box' && (
          <div className={styles.textsBox}>
            <h3 className={styles.title}>文本配置</h3>
            <FormItem label="内容" name="textsContent">
              <Input />
            </FormItem>
            <Space>
              <FormItem label="坐标X" name="textX">
                <InputNumber />
              </FormItem>
              <FormItem label="坐标Y" name="textY">
                <InputNumber />
              </FormItem>
            </Space>
          </div>
        )}

        <div className={styles.siteBox}>
          <h3 className={styles.title}>站台配置</h3>
          <div ref={props.draggableRef} className={styles.sitedraggableBox}>
            {stations.map((station, index) => (
              <div
                key={station.siteName}
                draggable
                className={styles.siteItem}
                data-json={JSON.stringify({
                  index,
                  label: station.siteName,
                  value: station.siteName,
                  type: 'box',
                  parentid: currentConfig?.id,
                  parentindex: currentConfig?.index,
                  width: 70,
                  height: 50,
                  eletype: 'site',
                })}
              >
                {station.siteName}
              </div>
            ))}
          </div>
        </div>
      </Form>
      <div className={styles.bottomBox}>
        <Button
          className={styles.deleteBut}
          onClick={() => {
            if (currentConfig && deleteElement?.(currentConfig)) {
              form.resetFields();
            }
          }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

export default forwardRef(DevSetting);
