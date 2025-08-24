require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

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
  queueLimit: 0,
});

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
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM t_users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
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

/**
 * Helper function to convert checkbox values from frontend ('มี' or undefined)
 * to a boolean (true/false) for the database.
 */
const toBoolean = (value) => value === "มี";

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
    if (existingPerson.length > 0) {
      return res
        .status(409)
        .json({ status: "error", message: "เลขบัตรประชาชนนี้มีในระบบแล้ว!" });
    }

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
      // เปลี่ยนชื่อคอลัมน์ status เป็น visit_status ชั่วคราวเพื่อให้ Frontend ทำงานได้ง่าย
      "SELECT *, status as visit_status FROM t_visits WHERE person_cid = ? ORDER BY visit_date ASC",
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
    // เปลี่ยนชื่อ visit_status กลับเป็น status ก่อนลง DB
    // visitData.status = visitData.visit_status;
    // delete visitData.visit_status; // ลบ key ที่ไม่ต้องการออก

    const sql = "INSERT INTO t_visits SET ?";
    const [result] = await pool.query(sql, [visitData]);
    res.status(201).json({
      status: "success",
      message: "Visit created successfully",
      data: { id: result.insertId, ...visitData },
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
    visitData.status = visitData.visit_status;
    delete visitData.visit_status;

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
    const [rows] = await pool.query(
      "SELECT hosp_name, hosp_name2, patients, previous_medication, add_medication, reduce_medication, stop_medication, remission FROM t_hospdata"
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
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
        SUM(status IS NULL) AS under_follow_up
      FROM t_persons
    `);
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server is running on port ${PORT}`);
});
