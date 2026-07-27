import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";
import { Avatar } from 'antd';

// Path -> { title, subtitle } shown in the header.
// Add an entry here whenever you add a new page under Layout.
const PAGE_META = {
  "/dashboard": { title: "Dashboard", },
  "/chit": { title: "Chit Pools", },
  "/analytics": { title: "Analytics", },
  "/profile": { title: "Profile Info", },
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const meta =
    PAGE_META[location.pathname] ||
    (location.pathname.startsWith("/chit/") ? { title: "Chit Details" } : null) ||
    { title: "Dashboard", subtitle: "" };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const goToProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };
  console.log(user, "user")
  return (
    <div className="topbar">
      <div>
        <h1 className="topbar-title">{meta.title}</h1>
        <p className="topbar-subtitle">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {meta.subtitle}
        </p>
      </div>

      <div className="topbar-actions">
        <div className="avatar-menu" ref={menuRef} style={{ position: "relative" }}>
          <button
            className="avatar-menu-trigger"
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {/* <Avatar size={50} src={user.profilePicture?.url} className="pf-avatar">
              {!user.profilePicture?.url && profile.name?.[0]?.toUpperCase()}
            </Avatar> */}
            <Avatar
              size={50}
              src={user?.profilePicture?.url || undefined}
              className="pf-avatar"
            >
              {getInitials(user?.name)}
            </Avatar>
            <ChevronDown size={15} color="#767A8C" />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                background: "#fff", border: "1px solid #E3E1DA", borderRadius: 8,
                boxShadow: "0 8px 24px rgba(20,33,61,0.1)", minWidth: 180, zIndex: 10,
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E3E1DA" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#14213D" }}>{user?.name}</div>
                <div style={{ fontSize: 11.5, color: "#9A9C9C" }}>{user?.email}</div>
              </div>
              <button
                onClick={goToProfile}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <UserCircle2 size={15} /> View Profile
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#C2483D", display: "flex", alignItems: "center", gap: 8,
                  borderTop: "1px solid #E3E1DA",
                }}
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}