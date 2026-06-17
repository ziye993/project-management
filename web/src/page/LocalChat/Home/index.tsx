import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {

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

} from '../../../utils/chatSocket';

import { loadChatIdentity } from '../../../utils/chatIdentity';

import { useNavigate } from '../../../Router';

import { baseServerIp, upload } from '../../../server';

import type { ActiveChat, ChatGroup, ChatMessage, ChatUser, Conversation } from '../../../type/chat';

import { MessageOutlined, PictureOutlined, SendOutlined, TeamOutlined, VideoCameraOutlined } from '@ant-design/icons';

import Button from '../../../UiComponents/Button';

import Modal from '../../../UiComponents/Modal';

import message from '../../../UiComponents/Modal/message';

import styles from './index.module.less';



function formatTime(ts?: number) {

  if (!ts) return '';

  const d = new Date(ts);

  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

}



function convTitle(conv: Conversation, users: ChatUser[], selfId: string) {

  if (conv.type === 'group') return conv.name || '群组';

  const other = conv.participants.find(id => id !== selfId);

  const user = users.find(u => u.userId === other);

  return user?.username || other || '未知用户';

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

  const activeChatRef = useRef<ActiveChat | null>(null);



  useEffect(() => {

    activeChatRef.current = activeChat;

  }, [activeChat]);



  const historyConvIds = useMemo(() => new Set(conversations.map(c => c.id)), [conversations]);



  const discoverUsers = useMemo(

    () => users.filter(u => u.userId !== selfId && !historyConvIds.has(makePrivateConvId(selfId, u.userId))),

    [users, selfId, historyConvIds],

  );



  const discoverGroups = useMemo(

    () => groups.filter(g => selfId && g.members.includes(selfId) && !historyConvIds.has(makeGroupConvId(g.id))),

    [groups, selfId, historyConvIds],

  );



  const scrollBottom = () => {

    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  };



  const openPrivateChat = useCallback((user: ChatUser) => {

    const convId = makePrivateConvId(selfId, user.userId);

    setActiveChat({ convId, type: 'private', targetId: user.userId, title: user.username });

    fetchChatHistory(convId);

    markChatRead(convId);

  }, [selfId]);



  const openGroupChat = useCallback((group: ChatGroup) => {

    const convId = makeGroupConvId(group.id);

    setActiveChat({ convId, type: 'group', targetId: group.id, title: group.name });

    fetchChatHistory(convId);

    markChatRead(convId);

  }, []);



  const openConversation = useCallback((conv: Conversation) => {

    if (conv.type === 'group' && conv.groupId) {

      openGroupChat({ id: conv.groupId, name: conv.name || '群组', creatorId: '', members: conv.participants, createdAt: 0 });

      return;

    }

    const other = conv.participants.find(id => id !== selfId);

    const user = users.find(u => u.userId === other);

    if (user) openPrivateChat(user);

  }, [openGroupChat, openPrivateChat, selfId, users]);



  useEffect(() => {

    connectChatSocket();



    setChatHandlers({

      onRegistered: data => setSelfId(data.userId),

      onUserList: setUsers,

      onConversationList: setConversations,

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



    return () => setChatHandlers({});

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



  const uploadMedia = async (file: File, type: 'image' | 'video') => {

    if (!activeChat) return;

    const formData = new FormData();

    formData.append('files', file);

    const endpoint = type === 'image' ? '/upload/uploadPic?source=chat' : '/upload/uploadMov?source=chat';

    try {

      const res = await upload(endpoint, formData);

      const item = res?.data?.[res.data.length - 1] || res?.data;

      const urlPath = type === 'image'

        ? `/static/pic/${item.storedName || item.filename}`

        : `/static/mov/${item.storedName || item.filename}`;

      const fullUrl = `${baseServerIp}${urlPath}`;

      if (activeChat.type === 'private') {

        sendPrivateMsg(activeChat.targetId, fullUrl, type);

      } else {

        sendGroupMsg(activeChat.targetId, fullUrl, type);

      }

    } catch {

      message.error('上传失败');

    }

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

            const online = conv.type === 'private' ? peer?.online : undefined;

            return (

              <button

                key={conv.id}

                type="button"

                className={`${styles.convItem} ${activeChat?.convId === conv.id ? styles.convActive : ''}`}

                onClick={() => openConversation(conv)}

              >

                <span className={styles.convAvatar}>

                  {conv.type === 'group' ? <TeamOutlined /> : (peer?.avatar || '?')}

                  {online !== undefined && (

                    <span className={`${styles.onlineDot} ${online ? styles.online : styles.offline}`} />

                  )}

                </span>

                <span className={styles.convBody}>

                  <span className={styles.convTop}>

                    <span className={styles.convName}>{title}</span>

                    <span className={styles.convTime}>{formatTime(conv.lastTime)}</span>

                  </span>

                  <span className={styles.convPreview}>{conv.lastMessage || '暂无消息'}</span>

                </span>

                {(conv.unreadCount || 0) > 0 && (

                  <span className={styles.unreadBadge}>{conv.unreadCount}</span>

                )}

              </button>

            );

          })}

          {!conversations.length && <p className={styles.emptyTip}>暂无聊天记录，从右侧选择用户开始对话</p>}

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

            <div className={styles.inputBar}>

              <input ref={picInputRef} type="file" accept="image/*" hidden onChange={e => {

                const f = e.target.files?.[0];

                if (f) uploadMedia(f, 'image');

                e.target.value = '';

              }} />

              <input ref={vidInputRef} type="file" accept="video/*" hidden onChange={e => {

                const f = e.target.files?.[0];

                if (f) uploadMedia(f, 'video');

                e.target.value = '';

              }} />

              <button type="button" className={styles.toolBtn} onClick={() => picInputRef.current?.click()}>

                <PictureOutlined />

              </button>

              <button type="button" className={styles.toolBtn} onClick={() => vidInputRef.current?.click()}>

                <VideoCameraOutlined />

              </button>

              <input

                className={styles.textInput}

                value={input}

                onChange={e => setInput(e.target.value)}

                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendText())}

                placeholder="输入消息..."

              />

              <button type="button" className={styles.sendBtn} onClick={sendText}>

                <SendOutlined />

              </button>

            </div>

          </>

        ) : (

          <div className={styles.chatEmpty}>

            <MessageOutlined style={{ fontSize: 48, color: '#ccc' }} />

            <p>双击右侧用户或群组开始对话</p>

          </div>

        )}

      </section>



      <aside className={styles.discoverPanel}>

        <div className={styles.panelHead}>

          <span className={styles.panelTitle}>发现</span>

          <Button onClick={() => setGroupModal(true)}>建群</Button>

        </div>

        <div className={styles.discoverSection}>

          <h4>用户</h4>

          {discoverUsers.map(user => (

            <div

              key={user.userId}

              className={styles.discoverItem}

              onDoubleClick={() => openPrivateChat(user)}

              title="双击开始对话"

            >

              <span className={styles.convAvatar}>

                {user.avatar}

                <span className={`${styles.onlineDot} ${user.online ? styles.online : styles.offline}`} />

              </span>

              <span className={styles.discoverName}>{user.username}</span>

              <span className={styles.discoverIp}>{user.ip}</span>

            </div>

          ))}

          {!discoverUsers.length && <p className={styles.emptyTip}>暂无可发现的用户</p>}

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

          <p className={styles.memberLabel}>选择成员（双击切换）</p>

          <div className={styles.memberList}>

            {users.filter(u => u.userId !== selfId).map(user => (

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


