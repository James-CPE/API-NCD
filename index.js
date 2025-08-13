require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const checkApiKey = (req, res, next) => {
  const apiKey = req.header('api-key');

  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
};

app.use(checkApiKey);

app.get('/', async (req, res) => {
    res.json({ message: 'Welcome to NCD API' });
})

// --- CRUD Endpoints ---
// POST /login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM t_users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
      delete user.password;
      res.json({ status: 'success', data: user });
    } else {
      res.status(401).json({ status: 'error', message: 'Invalid username or password' });
    }

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /users
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM t_users');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /person
app.get('/person', async (req, res) => {
  try {
    const { username } = req.query;
    let sqlQuery = 'SELECT * FROM t_person';
    const params = [];
    if (username && username.toLowerCase() !== 'admin') {
      sqlQuery += ' WHERE username = ?';
      params.push(username);
    }

    // Execute a Query
    const [rows] = await pool.query(sqlQuery, params);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /person/:cid
app.get('/person/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ status: 'error', message: 'CID is required' });
    }

    const [rows] = await pool.query('SELECT * FROM t_person WHERE cid = ?', [cid]);

    if (rows.length > 0) {
      res.json({ status: 'success', data: rows });
    } else {
      res.status(404).json({ status: 'error', message: 'Person not found' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
})

// GET /hospital data
app.get('/hospdata', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT hosp_name, hosp_name2, patients, previous_medication, add_medication, reduce_medication, stop_medication, remission FROM t_hospdata');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
})

// GET /dashboard data
app.get('/dashboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM t_dashboard');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
})

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server is running on port ${PORT}`);
});