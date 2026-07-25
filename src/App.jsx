import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import Dashboard from './pages/Tenant/Dashboard/Dashboard';
import ChitDetail from './pages/Tenant/ChitDetail/ChitDetail';
import Home from './pages/Home/Home'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/superadmin/dashboard" element={
            <PrivateRoute role="super_admin">
              <SuperAdminDashboard />
            </PrivateRoute>
          } />

<Route path="/home" element={
            <PrivateRoute role="tenant_admin">
              <Home />
            </PrivateRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute role="tenant_admin">
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/chit/:id" element={
            <PrivateRoute role="tenant_admin">
              <ChitDetail />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;