const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory Employee Mock Data (At least 5 records)
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

// Helper: Generate next ID
let nextId = 7;

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
app.get('/api/employees', (req, res) => {
  return res.status(200).json(employees);
});

// POST /api/employees - Add a new employee
app.post('/api/employees', (req, res) => {
  const { name, position, salary } = req.body;

  // Validation: Must receive name, position, and salary. If any is empty -> 400 Bad Request
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

  const newEmployee = {
    id: String(nextId++),
    name: String(name).trim(),
    position: String(position).trim(),
    status: "Active", // Default status
    salary: Number(salary)
  };

  employees.push(newEmployee);

  return res.status(201).json({
    success: true,
    employee: newEmployee
  });
});

// PUT /api/employees/:id/status - Toggle employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', (req, res) => {
  const { id } = req.params;
  const employee = employees.find(e => e.id === String(id));

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: `Employee with id ${id} not found.`
    });
  }

  // Toggle status
  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';

  return res.status(200).json({
    success: true,
    employee
  });
});

// DELETE /api/employees/:id - Remove employee from the system
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
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

// 1D K-Means clustering algorithm for k=3
function run1DKMeans(salaries, k = 3, maxIterations = 100) {
  if (salaries.length === 0) {
    return [];
  }

  // If fewer items than k, group existing ones
  const actualK = Math.min(k, salaries.length);
  const sorted = [...salaries].sort((a, b) => a - b);

  // Initialize centroids spread across sorted values
  let centroids = [];
  for (let i = 0; i < actualK; i++) {
    const idx = Math.floor((i / (actualK - 1 || 1)) * (sorted.length - 1));
    centroids.push(sorted[idx]);
  }

  // Iterative Lloyd's algorithm
  let clusters = Array.from({ length: actualK }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array.from({ length: actualK }, () => []);

    // Assignment step: Assign each salary to closest centroid
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

    // Update step: Recalculate centroids
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

  // Create combined cluster objects and sort ascending by centroid
  const clusterData = centroids.map((c, index) => ({
    centroid: Math.round(c),
    count: clusters[index].length
  })).sort((a, b) => a.centroid - b.centroid);

  // If actualK < 3, pad up to 3 tiers gracefully so response schema is always consistent
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
app.get('/api/employees/salary-clusters', (req, res) => {
  try {
    // Extract only salary values from current employees
    const salaries = employees
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

// Root status endpoint for quick verification
app.get('/', (req, res) => {
  res.json({ message: "HR Manager & Salary Analytics API is running" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
