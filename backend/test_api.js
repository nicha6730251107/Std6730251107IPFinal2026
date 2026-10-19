// Automated test script for all backend requirements
const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Backend Endpoints ===");

  // 1. Login success
  let r = await request('POST', '/api/login', { username: 'admin', password: 'password123' });
  console.log("1. Login Success:", r.status === 200 && r.data.success && r.data.token ? "PASS" : "FAIL", r);

  // 2. Login failure
  r = await request('POST', '/api/login', { username: 'admin', password: 'wrongpassword' });
  console.log("2. Login Failure 401:", r.status === 401 && !r.data.success ? "PASS" : "FAIL", r);

  // 3. Get employees
  r = await request('GET', '/api/employees');
  console.log("3. GET /api/employees (Count >= 5):", r.status === 200 && r.data.length >= 5 ? "PASS" : "FAIL", `Found ${r.data.length} employees`);

  // 4. POST /api/employees with empty field -> 400 Bad Request
  r = await request('POST', '/api/employees', { name: '', position: 'Developer', salary: 30000 });
  console.log("4. POST 400 Bad Request:", r.status === 400 ? "PASS" : "FAIL", r);

  // 5. POST /api/employees valid -> 201 Created
  r = await request('POST', '/api/employees', { name: 'Test User', position: 'DevOps', salary: 60000 });
  console.log("5. POST Valid Employee:", r.status === 201 && r.data.employee.name === 'Test User' ? "PASS" : "FAIL", r.data);
  const newId = r.data.employee.id;

  // 6. PUT /api/employees/:id/status
  r = await request('PUT', `/api/employees/${newId}/status`);
  console.log("6. PUT Toggle Status:", r.status === 200 && r.data.employee.status === 'On Leave' ? "PASS" : "FAIL", r.data);

  // 7. DELETE /api/employees/:id
  r = await request('DELETE', `/api/employees/${newId}`);
  console.log("7. DELETE Employee:", r.status === 200 && r.data.success ? "PASS" : "FAIL", r.data);

  // 8. GET /api/employees/salary-clusters
  r = await request('GET', '/api/employees/salary-clusters');
  console.log("8. GET K-Means Clusters:", r.status === 200 && r.data.clusters.length === 3 ? "PASS" : "FAIL", JSON.stringify(r.data, null, 2));

  console.log("=== All Tests Completed ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
