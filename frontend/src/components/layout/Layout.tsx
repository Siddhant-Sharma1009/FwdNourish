import { useState } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

import { Outlet, useLocation } from "react-router-dom";
import InventoryEntryNav from "../InventoryEntryNav";
function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const showInventoryEntryNav =
  location.pathname === "/inventory/add" ||
  location.pathname === "/csv-upload" ||
  location.pathname === "/scanner";
  return (
    /* 1. Change min-h-screen to h-screen and add overflow-hidden */
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      
      {/* Sidebar stays fixed inside the 100vh height */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main column setup */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* Navbar stays pinned at the top */}
        <Navbar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* 2. Add overflow-y-auto so ONLY the page content scrolls */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
         {showInventoryEntryNav && <InventoryEntryNav />}
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Layout;