import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import TenantDashboard from './pages/Tenant/Dashboard/Dashboard';
import ChitDetail from './pages/Tenant/ChitDetail/ChitDetail';

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

          <Route path="/dashboard" element={
            <PrivateRoute role="tenant_admin">
              <TenantDashboard />
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