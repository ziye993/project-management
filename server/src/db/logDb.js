import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.LOG_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.LOG_DB_PORT || '33306', 10),
  user: process.env.LOG_DB_USER || 'ziye',
  password: process.env.LOG_DB_PASSWORD || '',
  database: process.env.LOG_DB_NAME || 'pm',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

console.log({
    host: process.env.LOG_DB_HOST,
    port:  process.env.LOG_DB_PORT,
    user: process.env.LOG_DB_USER ,
    password: process.env.LOG_DB_PASSWORD  ,
    database: process.env.LOG_DB_NAME
})
process.on('SIGINT', async () => pool.end());
process.on('SIGTERM', async () => pool.end());

export default pool;
