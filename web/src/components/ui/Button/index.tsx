import styles from './index.module.less'
import type { ReactNode, CSSProperties } from 'react';

type ButtonColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | string;

interface IProps extends Omit<
  React.DetailedHTMLProps<React.HTMLProps<HTMLButtonElement>, HTMLButtonElement>,
  'type' | 'color'
> {
  children?: ReactNode;
  /** 语义色；不传 / default 为顶部透明按钮样式 */
  color?: ButtonColor;
  type?: 'button' | 'submit' | 'reset';
}

const COLOR_CLASS: Record<string, string> = {
  default: styles.default,
  primary: styles.primary,
  secondary: styles.secondary,
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
  info: styles.info,
};

export default function Button(props: IProps) {
  const {
    children,
    color,
    className,
    type = 'button',
    style,
    disabled,
    ...rest
  } = props;

  const tone = color && COLOR_CLASS[color] ? color : color ? 'custom' : 'default';
  const toneClass = tone === 'custom' ? '' : (COLOR_CLASS[tone] || styles.default);

  const customStyle: CSSProperties | undefined =
    tone === 'custom' && color
      ? { background: color, color: '#fff', borderColor: 'transparent', ...style }
      : style;

  return (
    <button
      type={type}
      disabled={disabled}
      className={[styles.btn, toneClass, className].filter(Boolean).join(' ')}
      style={customStyle}
      {...rest}
    >
      {children}
    </button>
  );
}
