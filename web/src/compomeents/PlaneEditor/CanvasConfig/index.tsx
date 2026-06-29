import styles from '../index.module.less';
import { Form, InputNumber, Select, Button, Modal } from 'antd';
import { useState } from 'react';
import type { FormInstance } from 'antd';
import { themeOptions, getThemePageDefaults } from '../themes';
import { EViewDatatype } from '../themes/types';
import type { PlanePageConfig, TConfigRef } from '../themes/types';

interface CanvasConfigProps {
  form: FormInstance<Partial<PlanePageConfig>>;
  onChange: (value: Partial<PlanePageConfig>) => void | Promise<void>;
  getConfig: (type: EViewDatatype) => TConfigRef[];
  saveData: () => void | Promise<void>;
  pageConfig: PlanePageConfig;
}

export default function CanvasConfig(props: CanvasConfigProps) {
  const [open, setOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'ins' | 'nes'>('ins');
  const [configPreview, setConfigPreview] = useState<TConfigRef[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className={styles.configBox}>
      <Form
        form={props.form}
        layout="inline"
        onValuesChange={async (_, value: Partial<PlanePageConfig>) => {
          setLoading(true);
          const themeDefaults = getThemePageDefaults(value.theme ?? 'rect');
          await props.onChange({ ...value, ...themeDefaults });
          setLoading(false);
        }}
      >
        <Form.Item label="画布长" name="width" initialValue={1920}>
          <InputNumber disabled={loading} />
        </Form.Item>
        <Form.Item label="画布宽" name="height" initialValue={1080}>
          <InputNumber disabled={loading} />
        </Form.Item>
        <Form.Item label="主题" name="theme" initialValue="rect">
          <Select disabled={loading} style={{ width: 140 }} options={themeOptions} />
        </Form.Item>
      </Form>
      <Button
        onClick={() => {
          setConfigPreview(props.getConfig(EViewDatatype.INS));
          setOpen(true);
        }}
      >
        查看配置
      </Button>
      <Button type="primary" style={{ marginLeft: 16 }} onClick={() => props.saveData()}>
        保存
      </Button>
      <Modal
        title="配置预览"
        open={open}
        onCancel={() => setOpen(false)}
        okText="保存"
        onOk={() => {
          props.saveData();
          setOpen(false);
        }}
        width={720}
      >
        数据类型：
        <Select
          style={{ width: 140, marginLeft: 8 }}
          options={[
            { label: '平面数据', value: 'ins' },
            { label: '嵌套数据', value: 'nes' },
          ]}
          value={previewType}
          onChange={v => {
            setPreviewType(v);
            setConfigPreview(
              props.getConfig(v === 'ins' ? EViewDatatype.INS : EViewDatatype.NES),
            );
          }}
        />
        <pre className={styles.jsonView}>
          {JSON.stringify({ ...props.pageConfig, data: configPreview }, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}
