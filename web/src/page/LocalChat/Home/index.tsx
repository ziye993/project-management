import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';
import {
  clearChatHandlers,
  connectChatSocket,
  createChatGroup,
  fetchChatHistory,
  fetchGroups,
  makeGroupConvId,
  makePrivateConvId,
  markChatRead,
  registerChatUser,
  sendGroupMsg,
  sendPrivateMsg,
  setChatHandlers,
  startConversation,
} from '../../../utils/chatSocket';
import { loadChatIdentity } from '../../../utils/chatIdentity';
import { fileNameFromUrl, getClipboardFiles, uploadChatFile } from '../../../utils/chatFileUpload';
import { useNavigate } from '../../../Router';
import type { ActiveChat, ChatGroup, ChatMessage, ChatUser, Conversation } from '../../../type/chat';
import { FileOutlined, MessageOutlined, PaperClipOutlined, PictureOutlined, SendOutlined, TeamOutlined, VideoCameraOutlined } from '@ant-design/icons';
import Button from '../../../UiComponents/Button';
import Modal from '../../../UiComponents/Modal';
import message from '../../../UiComponents/Modal/message';
import styles from './index.module.less';

function formatTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function convSortTime(conv: Conversation) {
  return Math.max(conv.lastTime || 0, conv.openedAt || 0, conv.updatedAt || 0);
}

function sortConversations(list: Conversation[]) {
  return [...list].sort((a, b) => convSortTime(b) - convSortTime(a));
}

function convTitle(conv: Conversation, users: ChatUser[], selfId: string) {
  if (conv.type === 'group') return conv.name || '群组';
  if (conv.peerName) return conv.peerName;
  const other = conv.participants.find(id => id !== selfId);
  const user = users.find(u => u.userId === other);
  return user?.username || other || '未知用户';
}

function mergeUsersFromConversations(users: ChatUser[], convs: Conversation[]) {
  const map = new Map(users.map(u => [u.userId, u]));
  convs.forEach(conv => {
    if (conv.type !== 'private' || !conv.peerId) return;
    const existing = map.get(conv.peerId);
    map.set(conv.peerId, {
      userId: conv.peerId,
      ip: existing?.ip || '',
      deviceId: existing?.deviceId || '',
      username: conv.peerName || existing?.username || conv.peerId,
      avatar: conv.peerAvatar || existing?.avatar || '?',
      online: existing?.online ?? false,
    });
  });
  return Array.from(map.values());
}

function upsertConversation(list: Conversation[], conv: Conversation) {
  const idx = list.findIndex(c => c.id === conv.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...conv };
    return sortConversations(next);
  }
  return sortConversations([conv, ...list]);
}

export default function LocalChatHome() {
  const { push } = useNavigate();
  const identity = loadChatIdentity();
  const [selfId, setSelfId] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const picInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeChatRef = useRef<ActiveChat | null>(null);
  const selfIdRef = useRef('');

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    selfIdRef.current = selfId;
  }, [selfId]);

  const historyConvIds = useMemo(() => new Set(conversations.map(c => c.id)), [conversations]);

  const discoverUsers = useMemo(
    () => users.filter(
      u => u.userId !== selfId
        && u.online
        && !historyConvIds.has(makePrivateConvId(selfId, u.userId)),
    ),
    [users, selfId, historyConvIds],
  );

  const discoverGroups = useMemo(
    () => groups.filter(g => selfId && g.members.includes(selfId) && !historyConvIds.has(makeGroupConvId(g.id))),
    [groups, selfId, historyConvIds],
  );

  const scrollBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const pinConversation = useCallback((conv: Conversation) => {
    setConversations(prev => upsertConversation(prev, conv));
    if (conv.type === 'private' && conv.peerId) {
      setUsers(prev => mergeUsersFromConversations(prev, [conv]));
    }
  }, []);

  const openPrivateChat = useCallback((user: ChatUser) => {
    const uid = selfIdRef.current;
    if (!uid) {
      message.error('正在连接，请稍候…');
      return;
    }

    const convId = makePrivateConvId(uid, user.userId);
    const now = Date.now();
    pinConversation({
      id: convId,
      type: 'private',
      participants: [uid, user.userId],
      peerId: user.userId,
      peerName: user.username,
      peerAvatar: user.avatar,
      lastMessage: '',
      openedAt: now,
      updatedAt: now,
      unreadCount: 0,
    });

    setActiveChat({ convId, type: 'private', targetId: user.userId, title: user.username });
    startConversation(convId);
    fetchChatHistory(convId);
    markChatRead(convId);
  }, [pinConversation]);

  const openGroupChat = useCallback((group: ChatGroup) => {
    const uid = selfIdRef.current;
    if (!uid) {
      message.error('正在连接，请稍候…');
      return;
    }

    const convId = makeGroupConvId(group.id);
    const now = Date.now();
    pinConversation({
      id: convId,
      type: 'group',
      groupId: group.id,
      name: group.name,
      participants: group.members,
      lastMessage: '',
      openedAt: now,
      updatedAt: now,
      unreadCount: 0,
    });

    setActiveChat({ convId, type: 'group', targetId: group.id, title: group.name });
    startConversation(convId);
    fetchChatHistory(convId);
    markChatRead(convId);
  }, [pinConversation]);

  const openConversation = useCallback((conv: Conversation) => {
    if (conv.type === 'group' && conv.groupId) {
      openGroupChat({
        id: conv.groupId,
        name: conv.name || '群组',
        creatorId: '',
        members: conv.participants,
        createdAt: 0,
      });
      return;
    }

    const other = conv.participants.find(id => id !== selfIdRef.current);
    const user = users.find(u => u.userId === other);
    if (user) {
      openPrivateChat(user);
      return;
    }

    if (!other) return;
    setActiveChat({
      convId: conv.id,
      type: 'private',
      targetId: other,
      title: conv.peerName || other,
    });
    startConversation(conv.id);
    fetchChatHistory(conv.id);
    markChatRead(conv.id);
  }, [openGroupChat, openPrivateChat, users]);

  useEffect(() => {
    connectChatSocket();

    setChatHandlers({
      onRegistered: data => setSelfId(data.userId),
      onUserList: onlineUsers => {
        setUsers(prev => {
          const offline = prev.filter(u => !u.online);
          const map = new Map(offline.map(u => [u.userId, { ...u, online: false }]));
          onlineUsers.forEach(u => map.set(u.userId, u));
          return Array.from(map.values());
        });
      },
      onConversationList: convs => {
        setConversations(prev => {
          const serverIds = new Set(convs.map(c => c.id));
          const localOnly = prev.filter(c => !serverIds.has(c.id));
          return sortConversations([...localOnly, ...convs]);
        });
        setUsers(prev => mergeUsersFromConversations(prev, convs));
      },
      onGroupList: setGroups,
      onChatHistory: ({ convId, messages: list }) => {
        if (activeChatRef.current?.convId === convId) {
          setMessages(list);
        }
      },
      onNewMsg: msg => {
        if (activeChatRef.current?.convId === msg.convId) {
          setMessages(prev => [...prev, msg]);
          markChatRead(msg.convId);
        }
      },
      onGroupCreated: ({ group }) => {
        setGroupModal(false);
        setGroupName('');
        setSelectedMembers([]);
        openGroupChat(group);
        message.success('群组已创建');
      },
    });

    registerChatUser(identity);
    fetchGroups();

    return () => {
      clearChatHandlers([
        'onRegistered',
        'onUserList',
        'onConversationList',
        'onGroupList',
        'onChatHistory',
        'onNewMsg',
        'onGroupCreated',
      ]);
    };
  }, [identity, openGroupChat]);

  useEffect(() => {
    scrollBottom();
  }, [messages]);

  const sendText = () => {
    const text = input.trim();
    if (!text || !activeChat) return;
    if (activeChat.type === 'private') {
      sendPrivateMsg(activeChat.targetId, text, 'text');
    } else {
      sendGroupMsg(activeChat.targetId, text, 'text');
    }
    setInput('');
  };

  const sendChatFile = async (file: File) => {
    if (!activeChat) return;
    try {
      const { url, type } = await uploadChatFile(file);
      if (activeChat.type === 'private') {
        sendPrivateMsg(activeChat.targetId, url, type);
      } else {
        sendGroupMsg(activeChat.targetId, url, type);
      }
    } catch {
      message.error('上传失败');
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (!activeChat) return;
    const files = getClipboardFiles(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    files.forEach(f => sendChatFile(f));
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      message.error('请输入群组名称');
      return;
    }
    createChatGroup(groupName.trim(), selectedMembers);
  };

  const renderMessage = (msg: ChatMessage) => {
    const isSelf = msg.from === selfId;
    const sender = users.find(u => u.userId === msg.from);
    return (
      <div key={msg.id} className={`${styles.msgRow} ${isSelf ? styles.msgSelf : ''}`}>
        {!isSelf && <span className={styles.msgAvatar}>{sender?.avatar || '?'}</span>}
        <div className={styles.msgBubble}>
          {!isSelf && activeChat?.type === 'group' && (
            <span className={styles.msgSender}>{sender?.username}</span>
          )}
          {msg.type === 'text' && <p>{msg.content}</p>}
          {msg.type === 'image' && (
            <img src={msg.content} alt="" className={styles.msgImage} onClick={() => window.open(msg.content)} />
          )}
          {msg.type === 'video' && (
            <video src={msg.content} controls className={styles.msgVideo} />
          )}
          {msg.type === 'file' && (
            <a href={msg.content} target="_blank" rel="noopener noreferrer" className={styles.msgFile}>
              <FileOutlined /> {fileNameFromUrl(msg.content)}
            </a>
          )}
          <span className={styles.msgTime}>{formatTime(msg.time)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <aside className={styles.historyPanel}>
        <div className={styles.panelHead}>
          <button type="button" className={styles.myAvatarBtn} onClick={() => push('/localChat/profile')}>
            <span className={styles.avatar}>{identity.avatar}</span>
          </button>
          <span className={styles.panelTitle}>聊天记录</span>
        </div>
        <div className={styles.convList}>
          {conversations.map(conv => {
            const title = convTitle(conv, users, selfId);
            const other = conv.participants.find(id => id !== selfId);
            const peer = users.find(u => u.userId === other);
            const avatar = conv.type === 'group'
              ? null
              : (peer?.avatar || conv.peerAvatar || '?');
            const online = conv.type === 'private' ? peer?.online : undefined;
            const unread = conv.unreadCount || 0;
            return (
              <button
                key={conv.id}
                type="button"
                className={`${styles.convItem} ${activeChat?.convId === conv.id ? styles.convActive : ''}`}
                onClick={() => openConversation(conv)}
              >
                <span className={styles.convAvatar}>
                  {conv.type === 'group' ? <TeamOutlined /> : avatar}
                  {online !== undefined && (
                    <span className={`${styles.onlineDot} ${online ? styles.online : styles.offline}`} />
                  )}
                </span>
                <span className={styles.convBody}>
                  <span className={styles.convTop}>
                    <span className={styles.convName}>{title}</span>
                    <span className={styles.convTime}>{formatTime(conv.lastTime || conv.openedAt)}</span>
                  </span>
                  <span className={styles.convPreview}>{conv.lastMessage || ' '}</span>
                </span>
                {unread > 0 && (
                  <span className={styles.unreadBadge}>{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
            );
          })}
          {!conversations.length && <p className={styles.emptyTip}>暂无聊天记录，从右侧选择在线用户开始对话</p>}
        </div>
      </aside>

      <section className={styles.chatPanel}>
        {activeChat ? (
          <>
            <div className={styles.chatHead}>{activeChat.title}</div>
            <div className={styles.msgList}>
              {messages.map(renderMessage)}
              <div ref={msgEndRef} />
            </div>
            <div className={styles.inputBar} onPaste={handlePaste}>
              <input ref={picInputRef} type="file" accept="image/*" hidden onChange={e => {
                const f = e.target.files?.[0];
                if (f) sendChatFile(f);
                e.target.value = '';
              }} />
              <input ref={vidInputRef} type="file" accept="video/*" hidden onChange={e => {
                const f = e.target.files?.[0];
                if (f) sendChatFile(f);
                e.target.value = '';
              }} />
              <input ref={fileInputRef} type="file" hidden onChange={e => {
                const f = e.target.files?.[0];
                if (f) sendChatFile(f);
                e.target.value = '';
              }} />
              <button type="button" className={styles.toolBtn} onClick={() => picInputRef.current?.click()} title="发送图片">
                <PictureOutlined />
              </button>
              <button type="button" className={styles.toolBtn} onClick={() => vidInputRef.current?.click()} title="发送视频">
                <VideoCameraOutlined />
              </button>
              <button type="button" className={styles.toolBtn} onClick={() => fileInputRef.current?.click()} title="发送文件">
                <PaperClipOutlined />
              </button>
              <input
                className={styles.textInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendText())}
                placeholder="输入消息，可直接粘贴文件..."
              />
              <button type="button" className={styles.sendBtn} onClick={sendText}>
                <SendOutlined />
              </button>
            </div>
          </>
        ) : (
          <div className={styles.chatEmpty}>
            <MessageOutlined style={{ fontSize: 48, color: '#ccc' }} />
            <p>双击右侧在线用户或群组开始对话</p>
          </div>
        )}
      </section>

      <aside className={styles.discoverPanel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>发现</span>
          <Button onClick={() => setGroupModal(true)}>建群</Button>
        </div>
        <div className={styles.discoverSection}>
          <h4>在线用户</h4>
          {discoverUsers.map(user => (
            <div
              key={user.userId}
              className={styles.discoverItem}
              onDoubleClick={() => openPrivateChat(user)}
              title="双击开始对话"
            >
              <span className={styles.convAvatar}>
                {user.avatar}
                <span className={`${styles.onlineDot} ${styles.online}`} />
              </span>
              <span className={styles.discoverName}>{user.username}</span>
              <span className={styles.discoverIp}>{user.ip}</span>
            </div>
          ))}
          {!discoverUsers.length && <p className={styles.emptyTip}>暂无在线用户</p>}
        </div>
        <div className={styles.discoverSection}>
          <h4>群组</h4>
          {discoverGroups.map(group => (
            <div
              key={group.id}
              className={styles.discoverItem}
              onDoubleClick={() => openGroupChat(group)}
              title="双击进入群组"
            >
              <span className={styles.convAvatar}><TeamOutlined /></span>
              <span className={styles.discoverName}>{group.name}</span>
              <span className={styles.discoverIp}>{group.members.length} 人</span>
            </div>
          ))}
          {!discoverGroups.length && <p className={styles.emptyTip}>暂无新群组</p>}
        </div>
      </aside>

      <Modal open={groupModal} title="创建群组" onClose={() => setGroupModal(false)} onOK={createGroup}>
        <div className={styles.groupForm}>
          <label>
            群组名称
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="输入群组名" />
          </label>
          <p className={styles.memberLabel}>选择成员（双击切换，仅在线用户）</p>
          <div className={styles.memberList}>
            {users.filter(u => u.userId !== selfId && u.online).map(user => (
              <button
                key={user.userId}
                type="button"
                className={`${styles.memberChip} ${selectedMembers.includes(user.userId) ? styles.memberSelected : ''}`}
                onDoubleClick={() => setSelectedMembers(prev =>
                  prev.includes(user.userId) ? prev.filter(id => id !== user.userId) : [...prev, user.userId]
                )}
              >
                {user.avatar} {user.username}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
