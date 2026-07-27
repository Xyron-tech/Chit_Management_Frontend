import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./Layout.css";

export default function Layout({ activeChits = 0, branchName = "Chennai branch" }) {
  return (
    <div className="dash">
      <Sidebar branchName={branchName} activeChits={activeChits} />
      <main className="main">
        <Header />
        <Outlet />
      </main>
    </div>
  );
}