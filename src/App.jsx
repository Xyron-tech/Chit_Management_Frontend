import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import Chit from './pages/Tenant/Dashboard/Dashboard';
import ChitDetail from './pages/Tenant/ChitDetail/ChitDetail';
import Home from './pages/Home/Home';
import Analytics from './pages/Analytics/Analytics';
import Profile from './components/layout/Profile';
import './index.css'

function App() {
  return (
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/superadmin/dashboard" element={
            <PrivateRoute role="super_admin">
              <SuperAdminDashboard />
            </PrivateRoute>
          } />

          {/* Everything below shares one Sidebar + Header via Layout + <Outlet /> */}
          <Route
            element={
              <PrivateRoute role="tenant_admin">
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Home />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/chit" element={<Chit />} />
            <Route path="/chit/:id" element={<ChitDetail />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
    </AuthProvider>
  );
}

export default App;