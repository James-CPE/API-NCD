require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors()); // อนุญาต Cross-Origin Requests
app.use(express.json()); // สำหรับ Parse JSON bodies

// สร้าง Connection Pool ไปยัง MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware สำหรับตรวจสอบ API Key (สำคัญมาก!)
const checkApiKey = (req, res, next) => {
  const apiKey = req.header('api-key');

  if (apiKey && apiKey === process.env.API_KEY) {
    next(); // ผ่าน
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
};

// ใช้ Middleware นี้กับทุก Route
app.use(checkApiKey);

// --- Test Endpoint ---
app.get('/', async (req, res) => {
    res.json({ message: 'Welcome to NCD API' });
})

// --- CRUD Endpoints ---
// GET /users
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_ncd');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server is running on port ${PORT}`);
});