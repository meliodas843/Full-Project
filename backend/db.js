import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "tuvshuu123",
  database: "Time_Management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
