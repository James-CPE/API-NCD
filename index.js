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

/**
 * Helper function to convert checkbox values from frontend ('มี' or undefined)
 * to a boolean (true/false) for the database.
 */
const toBoolean = (value) => value === 'มี';

// GET /persons
app.get('/persons', async (req, res) => {
  try {
    const { username } = req.query;
    let sqlQuery = 'SELECT * FROM t_persons';
    const params = [];
    console.log(username, params)
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

// GET /personss/:cid
app.get('/persons/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ status: 'error', message: 'CID is required' });
    }

    const [rows] = await pool.query('SELECT * FROM t_persons WHERE cid = ?', [cid]);

    if (rows.length > 0) {
      res.json({ status: 'success', data: rows });
    } else {
      res.status(404).json({ status: 'error', message: 'Person not found' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
})

// GET /personshos
app.get('/personshos', async (req, res) => {
  try {
    const { hospital } = req.query;
    let sqlQuery = 'SELECT * FROM t_persons';
    const params = [];
    if (hospital && hospital.toLowerCase() !== 'admin') {
      sqlQuery += ' WHERE hospital = ?';
      params.push(hospital);
    }

    // Execute a Query
    const [rows] = await pool.query(sqlQuery, params);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /persons
app.post('/persons', async (req, res) => {
  const {
    cid, fullname, gender, birth_day, birth_month, birth_year,
    occupation, tel,
    house_no, moo, village, subdistrict, district, province,
    ht, dlp, ckd, mi, stroke, copd, asthma, disease_other, medical_his,
    cigarette, cigarette_volume, alcohol, alcohol_volume, person_note, startdate, hospital,
  } = req.body;

  if (!cid || !fullname) {
    return res.status(400).json({ status: 'error', message: 'CID and Fullname are required' });
  }

  const newPersonData = {
    cid, fullname, gender, birth_day, birth_month, birth_year,
    occupation, tel, house_no, moo, village, subdistrict, district, province,
    ht: toBoolean(ht),
    dlp: toBoolean(dlp),
    ckd: toBoolean(ckd),
    mi: toBoolean(mi),
    stroke: toBoolean(stroke),
    copd: toBoolean(copd),
    asthma: toBoolean(asthma),
    disease_other,
    medical_his: toBoolean(medical_his),
    cigarette, cigarette_volume, alcohol, alcohol_volume, person_note,
    startdate, hospital,
    created_at: new Date(),
    updated_at: new Date(),
  }

  try {
    const sql = 'INSERT INTO t_persons SET ?';
    const [result] = await pool.query(sql, newPersonData);

    res.status(201).json({
      status: 'success',
      message: 'Person created successfully',
      data: {
        id: result.insertId,
        ...newPersonData
      }
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'This ID card already exists.' });
    }
    console.error('Error creating person:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
})

// PUT /persons/:id
app.put('/persons/:id', async (req, res) => {
  const { id } = req.params;
  const personDataToUpdate = req.body;

  personDataToUpdate.updated_at = new Date();

  // --- แปลงค่า checkbox ---
  const booleanFields = ['ht', 'dlp', 'ckd', 'mi', 'stroke', 'copd', 'asthma', 'medical_his'];
  for (const field of booleanFields) {
    // ตรวจสอบว่ามี field นี้ส่งมาเพื่ออัปเดตหรือไม่
    if (personDataToUpdate.hasOwnProperty(field)) {
        personDataToUpdate[field] = toBoolean(personDataToUpdate[field]);
    }
  }

  try {
    const sql = 'UPDATE t_persons SET ? WHERE id = ?';
    const [result] = await pool.query(sql, [personDataToUpdate, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Person not found' });
    }

    res.json({ status: 'success', message: 'Person updated successfully' });

  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
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