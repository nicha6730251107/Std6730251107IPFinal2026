import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Default Backend Base URL (Student Port 3082)
const DEFAULT_API_BASE = 'http://localhost:3082';

export default function App() {
  // Navigation / Auth State
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [showConfig, setShowConfig] = useState(false);

  // Employee CRUD State
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Phase 2: K-Means State
  const [clusters, setClusters] = useState([]);
  const [analyzingClusters, setAnalyzingClusters] = useState(false);
  const [clusterError, setClusterError] = useState('');

  // Cross-platform Alert Helper
  const displayAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Cross-platform Confirmation Dialog
  const displayConfirm = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  // ==========================================
  // Phase 1.1: Authentication (Login)
  // ==========================================
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      displayAlert('Login Error', 'Please enter both username and password.');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        fetchEmployees(); // Automatically load employees upon login
      } else {
        displayAlert('Login Failed', data.message || 'Invalid username or password.');
      }
    } catch (error) {
      displayAlert('Connection Error', `Cannot connect to server at ${apiBaseUrl}. Please ensure Backend server is running.`);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setEmployees([]);
    setClusters([]);
    setName('');
    setPosition('');
    setSalary('');
    setFormError('');
  };

  // ==========================================
  // Phase 1.2: CRUD Operations
  // ==========================================

  // Fetch all employees
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/employees`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data.data && Array.isArray(data.data)) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Add new employee with Client-Side Validation
  const handleAddEmployee = async () => {
    setFormError('');

    // Client-side Validation: prevent submission if fields are empty
    if (!name.trim() || !position.trim() || !salary.trim()) {
      setFormError('All fields (Name, Position, Salary) are required.');
      displayAlert('Validation Error', 'All fields (Name, Position, Salary) are required.');
      return;
    }

    const numericSalary = Number(salary.trim());
    if (isNaN(numericSalary) || numericSalary <= 0) {
      setFormError('Salary must be a valid positive number.');
      displayAlert('Validation Error', 'Salary must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          position: position.trim(),
          salary: numericSalary
        })
      });

      const data = await response.json();

      if (response.status === 201 || (response.ok && data.success)) {
        // Clear input form
        setName('');
        setPosition('');
        setSalary('');
        setFormError('');
        // Automatically update UI
        fetchEmployees();
      } else {
        displayAlert('Error', data.message || 'Failed to add employee.');
      }
    } catch (error) {
      displayAlert('Error', 'Unable to reach backend API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (id) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/employees/${id}/status`, {
        method: 'PUT'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Automatically update UI
        setEmployees(prev =>
          prev.map(emp => (emp.id === id ? data.employee : emp))
        );
      } else {
        displayAlert('Error', data.message || 'Failed to toggle status.');
      }
    } catch (error) {
      displayAlert('Error', 'Unable to reach backend API.');
    }
  };

  // Delete Employee with Confirmation Alert
  const handleDeleteEmployee = (id, empName) => {
    displayConfirm(
      'Confirm Deletion',
      `Are you sure you want to delete employee "${empName}"?`,
      async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/employees/${id}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (response.ok && data.success) {
            // Automatically update UI
            setEmployees(prev => prev.filter(emp => emp.id !== id));
          } else {
            displayAlert('Error', data.message || 'Failed to delete employee.');
          }
        } catch (error) {
          displayAlert('Error', 'Unable to reach backend API.');
        }
      }
    );
  };

  // ==========================================
  // Phase 2: K-Means Salary Analytics
  // ==========================================
  const handleAnalyzeSalary = async () => {
    setAnalyzingClusters(true);
    setClusterError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/employees/salary-clusters`);
      const data = await response.json();

      if (response.ok && data.success) {
        setClusters(data.clusters || []);
      } else {
        setClusterError(data.message || 'Failed to calculate clusters.');
        displayAlert('Error', data.message || 'Failed to calculate clusters.');
      }
    } catch (error) {
      setClusterError('Cannot reach backend clustering service.');
      displayAlert('Error', 'Cannot reach backend clustering service.');
    } finally {
      setAnalyzingClusters(false);
    }
  };

  const keyword = searchQuery.trim().toLowerCase();
  const filteredEmployees = keyword
    ? employees.filter(emp =>
        [emp.name, emp.position, emp.status, String(emp.salary)].some(v =>
          String(v).toLowerCase().includes(keyword)
        )
      )
    : employees;

  // ==========================================
  // Render: Login Screen
  // ==========================================
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>Internet Programming Exam 2026</Text>
              </View>
              <Text style={styles.title}>HR Manager & Salary Analytics</Text>
              <Text style={styles.subtitle}>Please sign in with administrator credentials</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                placeholder="Enter username (e.g. admin)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                placeholder="Enter password (e.g. password123)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.apiConfigBox}>
              <TouchableOpacity onPress={() => setShowConfig(!showConfig)}>
                <Text style={styles.apiConfigToggle}>
                  {showConfig ? 'Hide Server Configuration' : '⚙️ Server URL Settings'}
                </Text>
              </TouchableOpacity>
              {showConfig && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.helperText}>API Endpoint:</Text>
                  <TextInput
                    style={[styles.input, { fontSize: 13, paddingVertical: 6 }]}
                    placeholderTextColor="#6b7280"
                    value={apiBaseUrl}
                    onChangeText={setApiBaseUrl}
                    placeholder="http://localhost:5000"
                  />
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // Render: Dashboard Screen (CRUD & Analytics)
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Bar / Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.headerTitle}>HR Management Dashboard</Text>
            <Text style={styles.headerSubtitle}>Logged in as Administrator (admin)</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Phase 2: Salary Clustering Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Phase 2: Salary Structure Analytics</Text>
              <Text style={styles.sectionSubtitle}>1D K-Means Clustering (k=3 Tiers)</Text>
            </View>
            <TouchableOpacity
              style={[styles.analyticsButton, analyzingClusters && styles.buttonDisabled]}
              onPress={handleAnalyzeSalary}
              disabled={analyzingClusters}
            >
              <Text style={styles.analyticsButtonText}>
                {analyzingClusters ? 'Analyzing...' : 'Analyze Salary Structure'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {analyzingClusters && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#facc15" />
              <Text style={styles.loadingText}>Computing 1D K-Means clusters on server...</Text>
            </View>
          )}

          {/* Cluster Summary Cards */}
          {!analyzingClusters && clusters.length > 0 && (
            <View style={styles.clusterGrid}>
              {clusters.map((c, index) => (
                <View key={index} style={styles.clusterCard}>
                  <View style={styles.clusterHeader}>
                    <Text style={styles.clusterTierName}>{c.group}</Text>
                    <View style={styles.tierPill}>
                      <Text style={styles.tierPillText}>{c.count} Employees</Text>
                    </View>
                  </View>
                  <Text style={styles.centroidLabel}>Average Base Salary</Text>
                  <Text style={styles.centroidValue}>
                    ฿{Number(c.centroid).toLocaleString()}
                  </Text>
                  <Text style={styles.clusterSummaryHint}>
                    {c.count > 0 ? `Centroid: ฿${c.centroid}` : 'No employees in tier'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {clusterError ? (
            <Text style={styles.errorBanner}>{clusterError}</Text>
          ) : null}
        </View>

        {/* Phase 1: Add Employee Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add New Employee</Text>
          <Text style={styles.sectionSubtitle}>Create a new employee profile in memory</Text>

          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          <View style={styles.formGrid}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                placeholder="e.g. Alice Wonderland"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formCol}>
              <Text style={styles.label}>Position *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                placeholder="e.g. Senior Frontend Engineer"
                value={position}
                onChangeText={setPosition}
              />
            </View>

            <View style={styles.formCol}>
              <Text style={styles.label}>Monthly Salary (THB) *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6b7280"
                placeholder="e.g. 55000"
                keyboardType="numeric"
                value={salary}
                onChangeText={setSalary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleAddEmployee}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Adding Employee...' : '+ Add Employee'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phase 1: Employee List */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Employee Directory</Text>
              <Text style={styles.sectionSubtitle}>
                {keyword
                  ? `Showing ${filteredEmployees.length} of ${employees.length} employees`
                  : `Total: ${employees.length} employee records`}
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchEmployees}>
              <Text style={styles.refreshButtonText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, styles.searchInput]}
            placeholder="🔍 Search by name, position, status or salary"
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />

          {loadingEmployees ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#facc15" />
              <Text style={styles.loadingText}>Loading employee directory...</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <Text style={styles.emptyText}>
              {keyword
                ? `No employees match "${searchQuery.trim()}".`
                : 'No employees found. Add one above!'}
            </Text>
          ) : (
            filteredEmployees.map((item) => (
              <View key={item.id} style={styles.employeeCard}>
                <View style={styles.employeeInfo}>
                  <View style={styles.employeeHeaderRow}>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'Active' ? styles.statusActive : styles.statusLeave
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === 'Active'
                            ? styles.statusTextActive
                            : styles.statusTextLeave
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.employeePosition}>{item.position}</Text>
                  <Text style={styles.employeeSalary}>
                    Salary: ฿{Number(item.salary).toLocaleString()}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => handleToggleStatus(item.id)}
                  >
                    <Text style={styles.toggleButtonText}>
                      Toggle to {item.status === 'Active' ? 'On Leave' : 'Active'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteEmployee(item.id, item.name)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Theme: Red / Black / Gray / Yellow
const C = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  surfaceAlt: '#242424',
  border: '#333333',
  text: '#f5f5f5',
  muted: '#9ca3af',
  red: '#dc2626',
  redDark: '#7f1d1d',
  yellow: '#facc15',
  yellowDark: '#422006'
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  scrollContent: { padding: 16, maxWidth: 960, width: '100%', alignSelf: 'center' },
  loginCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: C.border,
    borderTopWidth: 4,
    borderTopColor: C.red,
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  loginHeader: { alignItems: 'center', marginBottom: 24 },
  badgeContainer: {
    backgroundColor: C.yellow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12
  },
  badgeText: { color: '#000000', fontSize: 12, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center' },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 6,
    borderLeftColor: C.red
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  headerSubtitle: { fontSize: 13, color: C.yellow, marginTop: 2 },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.red,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutButtonText: { color: C.red, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  sectionSubtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  analyticsButton: {
    backgroundColor: C.yellow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  analyticsButtonText: { color: '#000000', fontWeight: '800', fontSize: 14 },
  clusterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  clusterCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderTopWidth: 3,
    borderTopColor: C.yellow,
    borderRadius: 14,
    padding: 16
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  clusterTierName: { fontSize: 16, fontWeight: '800', color: C.yellow },
  tierPill: {
    backgroundColor: C.redDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  tierPillText: { fontSize: 11, fontWeight: '700', color: '#fecaca' },
  centroidLabel: { fontSize: 12, color: C.muted, marginBottom: 2 },
  centroidValue: { fontSize: 20, fontWeight: '800', color: C.text },
  clusterSummaryHint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  formGrid: { gap: 12, marginBottom: 16 },
  formCol: { flex: 1 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#d1d5db', marginBottom: 6 },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text
  },
  searchInput: { marginBottom: 14, borderColor: C.yellow },
  primaryButton: {
    backgroundColor: C.red,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  refreshButton: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  refreshButtonText: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  employeeCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.red,
    padding: 16,
    marginBottom: 12
  },
  employeeInfo: { marginBottom: 12 },
  employeeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  employeeName: { fontSize: 16, fontWeight: '700', color: C.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusActive: { backgroundColor: C.yellow },
  statusLeave: { backgroundColor: '#374151' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextActive: { color: '#000000' },
  statusTextLeave: { color: '#d1d5db' },
  employeePosition: { fontSize: 13, color: C.muted, marginBottom: 4 },
  employeeSalary: { fontSize: 14, fontWeight: '700', color: C.yellow },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10
  },
  toggleButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  toggleButtonText: { color: '#f3f4f6', fontSize: 12, fontWeight: '600' },
  deleteButton: {
    backgroundColor: C.redDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  deleteButtonText: { color: '#fecaca', fontSize: 12, fontWeight: '600' },
  loadingContainer: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: C.muted },
  emptyText: { textAlign: 'center', color: '#6b7280', padding: 20 },
  errorBanner: {
    backgroundColor: C.redDark,
    color: '#fecaca',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '500'
  },
  apiConfigBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  apiConfigToggle: { fontSize: 12, color: C.yellow, textAlign: 'center', fontWeight: '500' },
  helperText: { fontSize: 12, color: C.muted, marginBottom: 4 }
});
