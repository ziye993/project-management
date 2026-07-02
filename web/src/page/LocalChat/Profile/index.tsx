import { useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from '../../../Router';
import { loadChatIdentity, saveChatIdentity } from '../../../utils/chatIdentity';
import { connectChatSocket, registerChatUser, setChatHandlers, clearChatHandlers, updateChatProfile } from '../../../utils/chatSocket';
import Button from '@/components/ui/Button';
import message from '@/components/ui/Modal/message';
import styles from './index.module.less';

const AVATAR_PRESETS = ['😀', '😎', '🦊', '🐱', '🐶', '🌟', '🎮', '🎵', '🚀', '💡'];

export default function LocalChatProfile() {
  const { push } = useNavigate();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [userId, setUserId] = useState('');
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    const identity = loadChatIdentity();
    setUsername(identity.username);
    setAvatar(identity.avatar);
    setDeviceId(identity.deviceId);

    connectChatSocket();
    setChatHandlers({
      onRegistered: data => setUserId(data.userId),
      onProfileUpdated: data => {
        message.success('保存成功');
        setUsername(data.username);
        setAvatar(data.avatar);
      },
    });
    registerChatUser(identity);

    return () => {
      clearChatHandlers(['onRegistered', 'onProfileUpdated']);
    };
  }, []);

  const save = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      message.error('用户名不能为空');
      return;
    }
    const identity = { deviceId, username: trimmed, avatar };
    saveChatIdentity(identity);
    updateChatProfile({ username: trimmed, avatar });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <button type="button" className={styles.backBtn} onClick={() => push('/local-chat/home')}>
          <ArrowLeftOutlined /> 返回对话
        </button>
        <h2 className={styles.title}>个人信息</h2>
        <p className={styles.desc}>纯匿名聊天，无需密码。身份由本机 IP + 设备 ID 确定。</p>

        <div className={styles.preview}>
          <span className={styles.avatarLarge}>{avatar}</span>
          <span className={styles.previewName}>{username || '未设置'}</span>
        </div>

        <label className={styles.field}>
          用户名
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="输入用户名" maxLength={20} />
        </label>

        <div className={styles.field}>
          <span>头像</span>
          <div className={styles.avatarGrid}>
            {AVATAR_PRESETS.map(item => (
              <button
                key={item}
                type="button"
                className={`${styles.avatarOption} ${avatar === item ? styles.avatarSelected : ''}`}
                onClick={() => setAvatar(item)}
              >
                {item}
              </button>
            ))}
            <input
              className={styles.avatarTextInput}
              value={AVATAR_PRESETS.includes(avatar) ? '' : avatar}
              onChange={e => setAvatar(e.target.value.slice(0, 2) || avatar)}
              placeholder="自定义"
              maxLength={2}
            />
          </div>
        </div>

        <div className={styles.meta}>
          <p><strong>设备 ID：</strong>{deviceId}</p>
          {userId && <p><strong>用户 ID：</strong><code>{userId}</code></p>}
        </div>

        <Button onClick={save}>保存</Button>
      </div>
    </div>
  );
}
