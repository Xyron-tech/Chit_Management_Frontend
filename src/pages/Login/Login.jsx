import { useState } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import "./Login.css";

const Login = () => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      return message.error("Please enter email address");
    }

    if (!formData.password.trim()) {
      return message.error("Please enter password");
    }

    try {
      setLoading(true);

      const { data } = await API.post(
        "/auth/login",
        formData
      );

      login(data.user, data.token);

      message.success(`Welcome ${data.user.name}`);

      if (data.user.role === "super_admin") {
        navigate("/superadmin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const errData = err.response?.data;

      if (errData?.trialExpired) {
        return message.error(
          "Free trial period has expired"
        );
      }

      if (errData?.planExpired) {
        return message.error(
          "Subscription plan has expired"
        );
      }

      message.error(
        errData?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-left">
          <div className="brand-content">
            <h1>ChitSaaS</h1>
            <p>
              Smart Chit Fund Management Platform
            </p>

            <div className="feature-list">
              <div className="feature">
                Multi Tenant Architecture
              </div>

              <div className="feature">
                Chit & Member Management
              </div>

              <div className="feature">
                Subscription Management
              </div>

              <div className="feature">
                Secure Authentication
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">

            <div className="login-header">
              <h2>Sign In</h2>

              <p>
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

            </form>

            <div className="trial-box">
              New tenants receive a 7-day free trial period
            </div>

            <div className="footer-text">
              © 2026 ChitSaaS. All rights reserved.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;