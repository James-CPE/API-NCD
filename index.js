require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const rateLimit = require('express-rate-limit');
const app = express();

const corsOptions = {
  origin: process.env.DOMAIN,
  //origin: 'http://localhost:5173',
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// กำหนด rate limit: ไม่เกิน 5 requests ต่อ 1 นาที ต่อ IP
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 5, // จำกัด 5 ครั้ง
  message: { status: "error", message: "Too many login attempts. Please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const checkApiKey = (req, res, next) => {
  const apiKey = req.header("api-key");

  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
};

app.use(checkApiKey);

app.get("/", async (req, res) => {
  res.json({ message: "Welcome to NCD API" });
});

// --- CRUD Endpoints ---
// POST /login
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM t_users WHERE username = ? LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid username or password" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      delete user.password;
      res.json({ status: "success", data: user });
    } else {
      res
        .status(401)
        .json({ status: "error", message: "Invalid username or password" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /users
app.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM t_users");
    res.json({ status: "success", data: rows });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /persons
app.get("/persons", async (req, res) => {
  try {
    const { username } = req.query;
    let sqlQuery = "SELECT * FROM t_persons";
    const params = [];
    if (username && username.toLowerCase() !== "admin") {
      sqlQuery += " WHERE hospital = ?";
      params.push(username);
    }

    // Execute a Query
    const [rows] = await pool.query(sqlQuery, params);

    res.json({ status: "success", data: rows });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /personss/:cid
app.get("/persons/:cid", async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res
        .status(400)
        .json({ status: "error", message: "CID is required" });
    }

    const [rows] = await pool.query("SELECT * FROM t_persons WHERE cid = ?", [
      cid,
    ]);

    if (rows.length > 0) {
      res.json({ status: "success", data: rows });
    } else {
      res.status(404).json({ status: "error", message: "Person not found" });
    }
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /personshos
app.get("/personshos", async (req, res) => {
  try {
    const { hospital } = req.query;
    let sqlQuery = "SELECT * FROM t_persons";
    const params = [];
    if (hospital && hospital.toLowerCase() !== "admin") {
      sqlQuery += " WHERE hospital = ?";
      params.push(hospital);
    }

    // Execute a Query
    const [rows] = await pool.query(sqlQuery, params);

    res.json({ status: "success", data: rows });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /persons
app.post("/persons", async (req, res) => {
  const {
    cid,
    fullname,
    gender,
    birth_day,
    birth_month,
    birth_year,
    occupation,
    tel,
    house_no,
    moo,
    village,
    subdistrict,
    district,
    province,
    ht,
    dlp,
    ckd,
    mi,
    stroke,
    copd,
    asthma,
    disease_other,
    medical_his,
    cigarette,
    cigarette_volume,
    alcohol,
    alcohol_volume,
    person_note,
    startdate,
    status,
    hospital,
  } = req.body;

  if (!cid || !fullname) {
    return res
      .status(400)
      .json({ status: "error", message: "CID and Fullname are required" });
  }

  try {
    // ตรวจสอบว่า CID มีอยู่ในฐานข้อมูลแล้วหรือไม่
    const [existingPerson] = await pool.query(
      "SELECT * FROM t_persons WHERE cid = ?",
      [cid]
    );

    if (existingPerson.length > 0) {
      return res
        .status(409)
        .json({ status: "error", message: "เลขบัตรประชาชนนี้มีในระบบแล้ว!" });
    }

    const newPersonData = {
      cid,
      fullname,
      gender,
      birth_day,
      birth_month,
      birth_year,
      occupation,
      tel,
      house_no,
      moo,
      village,
      subdistrict,
      district,
      province,
      ht,
      dlp,
      ckd,
      mi,
      stroke,
      copd,
      asthma,
      disease_other,
      medical_his,
      cigarette,
      cigarette_volume,
      alcohol,
      alcohol_volume,
      person_note,
      startdate,
      status: status || "อยู่ระหว่างติดตาม",
      hospital,
      age: new Date().getFullYear() + 543 - birth_year,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const sql = "INSERT INTO t_persons SET ?";
    const [result] = await pool.query(sql, newPersonData);

    res.status(201).json({
      status: "success",
      message: "Created successfully",
      data: {
        id: result.insertId,
        ...newPersonData,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ status: "error", message: "This ID card already exists." });
    }
    console.error("Error creating person:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PUT /persons/:id
app.put("/persons/:id", async (req, res) => {
  const { id } = req.params;
  const personDataToUpdate = req.body;
  personDataToUpdate.updated_at = new Date();
  personDataToUpdate.age =
    new Date().getFullYear() + 543 - personDataToUpdate.birth_year;
  if (!personDataToUpdate.cid || !personDataToUpdate.fullname) {
    return res
      .status(400)
      .json({ status: "error", message: "CID and Fullname are required" });
  }

  try {
    // ตรวจสอบว่า CID มีอยู่ในฐานข้อมูลแล้วหรือไม่
    const [existingPerson] = await pool.query(
      "SELECT * FROM t_persons WHERE cid = ?",
      [personDataToUpdate.cid]
    );
    // if (existingPerson.length > 0) {
    //   return res
    //     .status(409)
    //     .json({ status: "error", message: "เลขบัตรประชาชนนี้มีในระบบแล้ว!" });
    // }

    const sql = "UPDATE t_persons SET ? WHERE id = ?";
    const [result] = await pool.query(sql, [personDataToUpdate, id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Person not found" });
    }

    res.json({ status: "success", message: "Person updated successfully" });
  } catch (error) {
    console.error("Error updating person:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE /api/persons/:id
app.delete("/persons/:id", async (req, res) => {
  const { id } = req.params; // ดึง ID ของผู้ป่วยที่จะลบจาก URL

  try {
    const sql = "DELETE FROM t_persons WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      // ถ้าไม่เจอ ID ที่ต้องการลบ
      return res
        .status(404)
        .json({ status: "error", message: "Person not found" });
    }

    res.json({ status: "success", message: "Person deleted successfully" });
  } catch (error) {
    console.error("Error deleting person:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ===============================================
// Visit Endpoints
// ===============================================

// GET all visits for a specific person by CID
app.get("/persons/:cid/visits", async (req, res) => {
  try {
    const { cid } = req.params;
    const [rows] = await pool.query(
      `SELECT *,
              t_visits.id as t_id,
              t_visits.status as visit_status,
              2hrpp as hrpp,
              gender
        FROM t_visits
        LEFT JOIN t_persons
        ON t_visits.person_cid = t_persons.cid
        WHERE person_cid = ?
        ORDER BY visit_date ASC`,
      [cid]
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Error fetching visits:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST a new visit
app.post("/visits", async (req, res) => {
  try {
    const visitData = req.body;

    // คำนวณ BMI ถ้ามี weight และ height
    if (visitData.weight && visitData.height) {
      const heightInMeters = visitData.height / 100;
      visitData.bmi = (
        visitData.weight /
        (heightInMeters * heightInMeters)
      ).toFixed(2);
    }

    const sql = "INSERT INTO t_visits SET ?";
    const [visitResult] = await pool.query(sql, [visitData]);

    if (visitData.person_cid && visitData.status) {
      const personSql = "UPDATE t_persons SET status = ? WHERE cid = ?";
      await pool.query(personSql, [visitData.status, visitData.person_cid])
    }

    res.status(201).json({
      status: "success",
      message: "Visit created successfully",
      data: { id: visitResult.insertId, ...visitData },
    });
  } catch (err) {
    console.error("Error creating visit:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PUT (update) an existing visit by ID
app.put("/visits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const visitData = req.body;

    // คำนวณ BMI อีกครั้งเผื่อมีการแก้ไข
    if (visitData.weight && visitData.height) {
      const heightInMeters = visitData.height / 100;
      visitData.bmi = (
        visitData.weight /
        (heightInMeters * heightInMeters)
      ).toFixed(2);
    }
    // เปลี่ยนชื่อ visit_status กลับเป็น status ก่อนลง DB
    // visitData.status = visitData.visit_status;
    // delete visitData.visit_status;

    const sql = "UPDATE t_visits SET ? WHERE id = ?";
    const [result] = await pool.query(sql, [visitData, id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Visit not found" });
    }
    res.json({ status: "success", message: "Visit updated successfully" });
  } catch (err) {
    console.error("Error updating visit:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE a visit by ID
app.delete("/visits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM t_visits WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Visit not found" });
    }
    res.json({ status: "success", message: "Visit deleted successfully" });
  } catch (err) {
    console.error("Error deleting visit:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /hospital data
app.get("/hospdata", async (req, res) => {
  try {
    const sqlQuery = `
      SELECT
        hospital,
        SUM(status = 'ยาเดิม') AS old_med,
        SUM(status = 'เพิ่มยา') AS add_med,
        SUM(status = 'ลดยา') AS reduce_med,
        SUM(status = 'หยุดยา') AS stop_med,
        SUM(status = 'Remission') AS remission,
        SUM(status = 'ผู้ป่วย DM ที่ไม่ได้รับยา') AS dm_no_med,
        SUM(status IS NULL OR status = "อยู่ระหว่างติดตาม") AS under_follow_up,
        COUNT(*) AS total_patients
      FROM t_persons
      GROUP BY hospital
    `;
    const [rows] = await pool.query(sqlQuery);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("Error fetching hospital data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /dashboard data
app.get("/dashboard", async (req, res) => {
  try {
    // const [rows] = await pool.query("SELECT * FROM t_dashboard");
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'ยาเดิม') AS old_med,
        SUM(status = 'เพิ่มยา') AS add_med,
        SUM(status = 'ลดยา') AS reduce_med,
        SUM(status = 'หยุดยา') AS stop_med,
        SUM(status = 'Remission') AS remission,
        SUM(status = 'ผู้ป่วย DM ที่ไม่ได้รับยา') AS dm_no_med,
        SUM(status IS NULL OR status = "อยู่ระหว่างติดตาม") AS under_follow_up
      FROM t_persons
    `);
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Get /fetch latest med
app.get("/fetchMed/:cid", async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res
        .status(400)
        .json({ status: "error", message: "CID is required" });
    }

    const [rows] = await pool.query(`
      SELECT
        medicine1,
        instruction1,
        quantity1,
        medicine2,
        instruction2,
        quantity2,
        medicine3,
        instruction3,
        quantity3,
        medicine4,
        instruction4,
        quantity4,
        medicine5,
        instruction5,
        quantity5
      FROM t_visits
      WHERE person_cid = ?
        AND (
          (medicine1 IS NOT NULL AND medicine1 <> '')
          OR (instruction1 IS NOT NULL AND instruction1 <> '')
          OR (quantity1 IS NOT NULL AND quantity1 <> '')
          OR (medicine2 IS NOT NULL AND medicine2 <> '')
          OR (instruction2 IS NOT NULL AND instruction2 <> '')
          OR (quantity2 IS NOT NULL AND quantity2 <> '')
          OR (medicine3 IS NOT NULL AND medicine3 <> '')
          OR (instruction3 IS NOT NULL AND instruction3 <> '')
          OR (quantity3 IS NOT NULL AND quantity3 <> '')
          OR (medicine3 IS NOT NULL AND medicine4 <> '')
          OR (instruction3 IS NOT NULL AND instruction4 <> '')
          OR (quantity3 IS NOT NULL AND quantity4 <> '')
          OR (medicine3 IS NOT NULL AND medicine5 <> '')
          OR (instruction3 IS NOT NULL AND instruction5 <> '')
          OR (quantity3 IS NOT NULL AND quantity5 <> '')
        )
      ORDER BY id DESC
      LIMIT 1;
      `, [cid]
    );

    if (rows.length > 0) {
      res.json({ status: "success", data: rows });
    } else {
      res.status(404).json({ status: "error", message: "Visit not found" });
    }
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
})

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server is running on port ${PORT}`);
});
