import styles from './index.module.less'
import type { ReactNode } from "react";

interface IProps extends React.DetailedHTMLProps<React.HTMLProps<HTMLDivElement>, HTMLDivElement> {
  children?: ReactNode;
  color?: string;

}

const defaultColors: { [key: string]: any } = {
  default: {
    backgroundColor: '#f0f0f0', // 亮灰色背景
    color: '#333', // 深灰文字
  },
  success: {
    backgroundColor: '#5cb85c', // 明亮的成功绿色
    color: '#fff', // 白色文字
  },
  warning: {
    backgroundColor: '#ffca2c', // 活泼的黄色
    color: '#fff', // 白色文字
  },
  error: {
    backgroundColor: '#ff5a5f', // 鲜艳的红色
    color: '#fff', // 白色文字
  },
  info: {
    backgroundColor: '#17a2b8', // 明亮的蓝色
    color: '#fff', // 白色文字
  },
  primary: {
    backgroundColor: '#007bff', // 亮蓝色
    color: '#fff', // 白色文字
  },
  secondary: {
    backgroundColor: '#6c757d', // 浅灰色
    color: '#fff', // 白色文字
  },
};

export default function Button(props: IProps) {
  return <div className={styles.box}
    {...props}
    style={{
      backgroundColor: props?.color,
      ...(props?.color ? (defaultColors?.[props?.color] ?? {}) : {}),
    }}
  >{props.children}</div>
}