import mysql from 'mysql2/promise';

// Pool nhỏ: poller 1 query/15s (IDLE) hoặc 1s (ARMED), render 1 lần vài chục query
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'db',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'submillion',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'dmoj',
  connectionLimit: 2,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

export async function q(sql) {
  const [rows] = await pool.query(sql);
  return rows;
}

export async function one(sql) {
  const rows = await q(sql);
  return rows[0];
}

export function esc(v) {
  return pool.escape(v);
}
