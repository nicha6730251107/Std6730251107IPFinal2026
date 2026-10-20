require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3082;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory Employee Mock Data (Fallback & default as required by exam)
let employees = [
  {
    id: "1",
    name: "John Doe",
    position: "Software Engineer",
    status: "Active",
    salary: 45000
  },
  {
    id: "2",
    name: "Sarah Jenkins",
    position: "Junior Developer",
    status: "Active",
    salary: 22000
  },
  {
    id: "3",
    name: "Michael Chang",
    position: "Office Assistant",
    status: "On Leave",
    salary: 18000
  },
  {
    id: "4",
    name: "Emily Watson",
    position: "Project Manager",
    status: "Active",
    salary: 52000
  },
  {
    id: "5",
    name: "David Kim",
    position: "Engineering Director",
    status: "Active",
    salary: 95000
  },
  {
    id: "6",
    name: "Jessica Taylor",
    position: "VP of Technology",
    status: "On Leave",
    salary: 85000
  }
];

let nextId = 7;

// Optional Database Integration (MySQL / phpMyAdmin)
let pool = null;
let useDb = false;
let tableName = 'NichaChom_251107';

// Only attempt MySQL when configured via .env; otherwise stay fully in-memory
try {
  if (!process.env.DB_HOST) throw new Error('DB_HOST not set');
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 3000
  });

  // Verify connection asynchronously
  (async () => {
    try {
      const conn = await pool.getConnection();
      console.log('✅ Connected to MySQL database successfully');
      const [t1] = await conn.query("SHOW TABLES LIKE 'NichaChom_251107'");
      if (t1.length > 0) {
        tableName = 'NichaChom_251107';
        useDb = true;
      } else {
        const [t2] = await conn.query("SHOW TABLES LIKE 'employees'");
        if (t2.length > 0) {
          tableName = 'employees';
          useDb = true;
        }
      }
      conn.release();
      console.log(`Database storage: ${useDb ? 'Connected to table ' + tableName : 'Using in-memory array'}`);
    } catch (err) {
      console.log('⚠️ MySQL connection unavailable, running in in-memory mode:', err.code || '', err.message);
      useDb = false;
    }
  })();
} catch (e) {
  useDb = false;
  console.log('Database storage: Using in-memory array');
}

// ==========================================
// Phase 1: Authentication & CRUD Endpoints
// ==========================================

// POST /api/login - Authentication (Login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({
      success: true,
      token: "mock-jwt-token"
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid username or password"
  });
});

// GET /api/employees - Return all employee records
app.get('/api/employees', async (req, res) => {
  if (useDb && pool) {
    try {
      const [rows] = await pool.query(`SELECT id, name, position, status, salary FROM \`${tableName}\``);
      if (rows && rows.length > 0) {
        return res.status(200).json(rows.map(r => ({
          id: String(r.id),
          name: r.name,
          position: r.position,
          status: r.status,
          salary: Number(r.salary)
        })));
      }
    } catch (err) {
      console.error('DB query error, fallback to memory:', err.message);
    }
  }

  return res.status(200).json(employees);
});

// POST /api/employees - Add a new employee
app.post('/api/employees', async (req, res) => {
  const { name, position, salary } = req.body;

  // Validation: Must receive name, position, and numeric salary. If empty -> 400 Bad Request
  if (
    name === undefined || name === null || String(name).trim() === '' ||
    position === undefined || position === null || String(position).trim() === '' ||
    salary === undefined || salary === null || String(salary).trim() === '' ||
    isNaN(Number(salary))
  ) {
    return res.status(400).json({
      success: false,
      message: "Bad Request: 'name', 'position', and numeric 'salary' are required."
    });
  }

  const numericSalary = Number(salary);
  let newEmployee = {
    id: String(nextId++),
    name: String(name).trim(),
    position: String(position).trim(),
    status: "Active",
    salary: numericSalary
  };

  let savedToDb = false;
  if (useDb && pool) {
    try {
      const [result] = await pool.query(
        `INSERT INTO \`${tableName}\` (name, position, status, salary) VALUES (?, ?, 'Active', ?)`,
        [newEmployee.name, newEmployee.position, newEmployee.salary]
      );
      if (result && result.insertId) {
        newEmployee.id = String(result.insertId);
      }
      savedToDb = true;
    } catch (err) {
      console.error('DB insert error, saving to memory:', err.message);
    }
  }

  if (!savedToDb) employees.push(newEmployee);

  return res.status(201).json({
    success: true,
    employee: newEmployee
  });
});

// PUT /api/employees/:id/status - Toggle employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', async (req, res) => {
  const { id } = req.params;

  if (useDb && pool) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
      if (rows && rows.length > 0) {
        const current = rows[0];
        const nextStatus = current.status === 'Active' ? 'On Leave' : 'Active';
        await pool.query(`UPDATE \`${tableName}\` SET status = ? WHERE id = ?`, [nextStatus, id]);
        return res.status(200).json({
          success: true,
          employee: {
            id: String(current.id),
            name: current.name,
            position: current.position,
            status: nextStatus,
            salary: Number(current.salary)
          }
        });
      }
    } catch (err) {
      console.error('DB update error, fallback to memory:', err.message);
    }
  }

  const employee = employees.find(e => e.id === String(id));
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: `Employee with id ${id} not found.`
    });
  }

  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';

  return res.status(200).json({
    success: true,
    employee
  });
});

// DELETE /api/employees/:id - Remove employee from the system
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;

  if (useDb && pool) {
    try {
      const [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
      if (result && result.affectedRows > 0) {
        employees = employees.filter(e => e.id !== String(id));
        return res.status(200).json({
          success: true,
          message: "Employee deleted successfully."
        });
      }
    } catch (err) {
      console.error('DB delete error, fallback to memory:', err.message);
    }
  }

  const index = employees.findIndex(e => e.id === String(id));
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Employee with id ${id} not found.`
    });
  }

  const deleted = employees.splice(index, 1)[0];

  return res.status(200).json({
    success: true,
    message: "Employee deleted successfully.",
    employee: deleted
  });
});

// ==========================================
// Phase 2: K-Means Salary Clustering (k=3)
// ==========================================

function run1DKMeans(salaries, k = 3, maxIterations = 100) {
  if (salaries.length === 0) return [];

  const actualK = Math.min(k, salaries.length);
  const sorted = [...salaries].sort((a, b) => a - b);

  let centroids = [];
  for (let i = 0; i < actualK; i++) {
    const idx = Math.floor((i / (actualK - 1 || 1)) * (sorted.length - 1));
    centroids.push(sorted[idx]);
  }

  let clusters = Array.from({ length: actualK }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array.from({ length: actualK }, () => []);

    for (const val of salaries) {
      let minDist = Infinity;
      let closestIdx = 0;
      for (let c = 0; c < actualK; c++) {
        const dist = Math.abs(val - centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = c;
        }
      }
      clusters[closestIdx].push(val);
    }

    let changed = false;
    for (let c = 0; c < actualK; c++) {
      if (clusters[c].length > 0) {
        const sum = clusters[c].reduce((acc, curr) => acc + curr, 0);
        const newCentroid = sum / clusters[c].length;
        if (Math.abs(newCentroid - centroids[c]) > 0.001) {
          centroids[c] = newCentroid;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  const clusterData = centroids.map((c, index) => ({
    centroid: Math.round(c),
    count: clusters[index].length
  })).sort((a, b) => a.centroid - b.centroid);

  const result = [];
  for (let i = 0; i < 3; i++) {
    if (i < clusterData.length) {
      result.push({
        group: `Tier ${i + 1}`,
        centroid: clusterData[i].centroid,
        count: clusterData[i].count
      });
    } else {
      result.push({
        group: `Tier ${i + 1}`,
        centroid: 0,
        count: 0
      });
    }
  }

  return result;
}

// GET /api/employees/salary-clusters
app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    let currentEmployees = employees;
    if (useDb && pool) {
      try {
        const [rows] = await pool.query(`SELECT salary FROM \`${tableName}\``);
        if (rows && rows.length > 0) {
          currentEmployees = rows;
        }
      } catch (err) {
        console.error('DB query for clusters error:', err.message);
      }
    }

    const salaries = currentEmployees
      .map(e => Number(e.salary))
      .filter(s => !isNaN(s));

    const clusters = run1DKMeans(salaries, 3);

    return res.status(200).json({
      success: true,
      clusters
    });
  } catch (error) {
    console.error("Error computing salary clusters:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during clustering."
    });
  }
});

// Root status endpoint
app.get('/', (req, res) => {
  res.json({
    message: "HR Manager & Salary Analytics API is running",
    port: PORT,
    storage: useDb ? `MySQL (${tableName})` : "In-memory"
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
