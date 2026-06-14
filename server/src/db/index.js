import Database from './sqlBD.js';
// 配置数据库连接
const config = {
  server: 'localhost',   // 或 'localhost\\SQLEXPRESS'
  database: 'ziye',
  user: 'sa',
  password: 'www.zwd993.com',
  // driver: 'msnodesqlv8',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    trustedConnection: false
  },
  pool: {max: 20, min: 2},
  port: 1434,
};

// 创建数据库实例
const db = new Database(config);


console.log("数据库池启动成功");

// 程序结束时断开连接
process.on("SIGINT", async () => db.close());   // Ctrl+C
process.on("SIGTERM", async () => db.close());  // kill 命令

export default db
