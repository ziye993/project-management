
import {Server} from 'socket.io';
import server from '../../serverHttp.js'

const io = new Server(server);

let users = {}; // { socketId: { ip, name } }
let chats = {}; // { 'ipA-ipB': [ {from, to, msg, time} ] }

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  users[socket.id] = { ip };

  io.emit('userList', Object.values(users));

  socket.on('privateMsg', ({ toIp, msg }) => {
    const fromIp = users[socket.id]?.ip;
    if (!fromIp) return;
    const chatKey = [fromIp, toIp].sort().join('-');
    const time = new Date().toLocaleTimeString();
    const record = { from: fromIp, to: toIp, msg, time };
    chats[chatKey] = chats[chatKey] || [];
    chats[chatKey].push(record);

    // 找到接收方socket
    const target = Object.entries(users).find(([_, u]) => u.ip === toIp);
    if (target) io.to(target[0]).emit('newMsg', { fromIp, msg, time });
    socket.emit('chatHistory', chats[chatKey]); // 回传当前记录
  });

  socket.on('getHistory', (toIp) => {
    const fromIp = users[socket.id]?.ip;
    const chatKey = [fromIp, toIp].sort().join('-');
    socket.emit('chatHistory', chats[chatKey] || []);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('userList', Object.values(users));
  });
});
