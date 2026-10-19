# Final Exam: Internet Programming (2026)
## Topic: HR Manager & Salary Analytics System
**Repository:** `Std6730251107IPFinal2026`  
**Student ID:** `6730251107`

---

## 📌 Project Overview
A full-stack Human Resource Management & Salary Analytics system built with:
- **Backend:** Express.js (Node.js) featuring Authentication, in-memory CRUD operations, and a 1D K-Means clustering algorithm ($k=3$).
- **Frontend:** React Native (Expo) featuring responsive UI for Web, iOS, and Android with form validation, confirmation dialogs, loading states, and summary cards.

---

## 📁 Project Directory Structure
```text
Std6730251107IPFinal2026/
├── backend/                  # Express.js backend server
│   ├── package.json
│   ├── server.js             # API routes (Auth, CRUD, K-Means)
│   └── test_api.js           # Automated API verification test suite
├── frontend/                 # React Native (Expo) client
│   ├── package.json
│   ├── app.json
│   └── App.js                # Login & CRUD Dashboard UI
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started (How to Run)

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

---

### 2. Start the Backend Server (Express.js)
Open a terminal and run:
```bash
cd backend
npm install
npm start
```
The backend server will run at `http://localhost:5000`.

*(Optional) To run the automated API test suite:*
```bash
node test_api.js
```

---

### 3. Start the Frontend Application (React Native / Expo)
Open a second terminal and run:
```bash
cd frontend
npm install
npx expo start
```
- **Web Browser (Recommended for quick grading):** Press `w` or run `npm run web` to open in your browser (`http://localhost:8081`).
- **Mobile (Expo Go):** Scan the QR code using the Expo Go app on iOS or Android.

---

## 🔑 Login Credentials
- **Username:** `admin`
- **Password:** `password123`

---

## 📡 API Endpoints Documentation

### Phase 1: Authentication & CRUD
| Method | Endpoint | Description | Request Body / Params | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/login` | Administrator login | `{ "username": "admin", "password": "password123" }` | `200 OK` / `401 Unauthorized` |
| **GET** | `/api/employees` | Retrieve all employee records | None | `200 OK` |
| **POST** | `/api/employees` | Add a new employee | `{ "name": "...", "position": "...", "salary": 50000 }` | `201 Created` / `400 Bad Request` |
| **PUT** | `/api/employees/:id/status` | Toggle employee status (`Active` $\leftrightarrow$ `On Leave`) | URL param `id` | `200 OK` / `404 Not Found` |
| **DELETE** | `/api/employees/:id` | Delete employee record | URL param `id` | `200 OK` / `404 Not Found` |

### Phase 2: K-Means Salary Clustering
| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/employees/salary-clusters` | Analyzes all salaries into 3 tiers using 1D K-Means | `{ "success": true, "clusters": [...] }` |

**Sample Cluster Response:**
```json
{
  "success": true,
  "clusters": [
    { "group": "Tier 1", "centroid": 20000, "count": 2 },
    { "group": "Tier 2", "centroid": 48500, "count": 2 },
    { "group": "Tier 3", "centroid": 90000, "count": 2 }
  ]
}
```

---

## 🎯 Grading Rubric Alignment (100 Points)

### Phase 1: CRUD & Authentication (60 Points)
- **[15 pts] Login System:** Blocks unauthorized access (401), grants access and returns token on valid credentials.
- **[20 pts] Backend API (CRUD):** All CRUD endpoints (`GET`, `POST`, `PUT /status`, `DELETE`) function correctly and enforce 400 Bad Request on empty/invalid inputs.
- **[15 pts] Frontend Integration:** Real-time UI updates automatically when adding, editing status, or deleting employees.
- **[10 pts] Client-side Error Handling:** Form validation blocks empty inputs, and a confirmation alert ("Are you sure?") is required before deletion.

### Phase 2: K-Means Analytics (30 Points)
- **[15 pts] K-Means Clustering Backend:** Custom 1D K-Means ($k=3$) partitions salaries into 3 tiers without crashing, handling edge cases gracefully.
- **[15 pts] Frontend UI & Loading State:** Displays a loading indicator (`ActivityIndicator`) while fetching cluster calculations, followed by 3 summary cards showing Tier name, employee count, and centroid base salary.

### Project Management & Architecture (10 Points)
- **[10 pts] Repository & Server Execution:** Follows mandatory `Std6730251107IPFinal2026` naming, clean `backend/` and `frontend/` directory structure, and both servers start without issues.
