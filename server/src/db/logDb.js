import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.LOG_DB_HOST || 'ziye993.cn',
  port: parseInt(process.env.LOG_DB_PORT || '43306', 10),
  user: process.env.LOG_DB_USER || 'ziye',
  password: process.env.LOG_DB_PASSWORD || '',
  database: process.env.LOG_DB_NAME || 'pm',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});
console.log({
    host: process.env.LOG_DB_HOST || 'ziye993.cn',
    port: parseInt(process.env.LOG_DB_PORT || '43306', 10),
    user: process.env.LOG_DB_USER || 'ziye',
    password: process.env.LOG_DB_PASSWORD || '',
    database: process.env.LOG_DB_NAME || 'pm',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
})

process.on('SIGINT', async () => pool.end());
process.on('SIGTERM', async () => pool.end());

export default pool;
