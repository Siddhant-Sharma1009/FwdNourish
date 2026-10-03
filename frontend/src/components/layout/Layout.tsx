import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import InventoryEntryNav from "../InventoryEntryNav";

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const showInventoryEntryNav =
    location.pathname === "/inventory/add" ||
    location.pathname === "/csv-upload" ||
    location.pathname === "/scanner";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Only the page content scrolls */}
        <main className="flex-1 overflow-y-auto">
          {/* THE ONLY place that controls page padding and max width */}
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            {showInventoryEntryNav && (
              <div className="mb-6">
                <InventoryEntryNav />
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;