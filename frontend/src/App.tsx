import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Tenant / Business pages
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddInventory from "./pages/AddInventory";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import CSVUpload from "./pages/CSVUpload";
import Scanner from "./pages/Scanner";
import POSIntegration from "./pages/POSIntegration";
import Transactions from "./pages/Transactions";
import SurplusListings from "./pages/SurplusListings";
import AIForecasting from "./pages/AIForecasting";

// Auth pages
import Login from "./pages/auth/Login";
import TenantSignup from "./pages/auth/TenantSignup";
import NgoSignup from "./pages/auth/NgoSignup";
import Pending from "./pages/auth/Pending";

// Role dashboards
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountReview from "./pages/admin/AccountReview";
import NGODashboard from "./pages/ngo/NGODashboard";
import NGORequirements from "./pages/ngo/NGORequirements";
import NGOMatches from "./pages/ngo/NGOMatches";
import BusinessPickups from "./pages/BusinessPickups";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            PUBLIC / AUTH
        ========================== */}

        {/* Open application on Dashboard */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/signup/tenant"
          element={<TenantSignup />}
        />

        <Route
          path="/signup/ngo"
          element={<NgoSignup />}
        />

        <Route
          path="/pending"
          element={<Pending />}
        />


        {/* =========================
            ADMIN
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route element={<Layout />}>

            <Route
              path="/admin"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/accounts/:userId"
              element={<AccountReview />}
            />

          </Route>
        </Route>


        {/* =========================
            NGO
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["NGO"]} />
          }
        >
          <Route element={<Layout />}>

            <Route
              path="/ngo"
              element={<NGODashboard />}
            />
            <Route
              path="/ngo/requirements"
              element={<NGORequirements />}
            />
            <Route path="/ngo/matches" element={<NGOMatches />} />

          </Route>
        </Route>


        {/* =========================
            TENANT / BUSINESS
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["TENANT"]} />
          }
        >
          <Route element={<Layout />}>

            {/* MAIN DASHBOARD */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Backward-compatible tenant route */}
            <Route
              path="/tenant"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={<Inventory />}
            />

            <Route
              path="/inventory/add"
              element={<AddInventory />}
            />

            {/* Other tenant pages */}
            <Route
              path="/expiry-alerts"
              element={<ExpiryAlerts />}
            />

            <Route
              path="/csv-upload"
              element={<CSVUpload />}
            />

            <Route
              path="/scanner"
              element={<Scanner />}
            />

            <Route
              path="/pos"
              element={<POSIntegration />}
            />

            {/* AI Forecasting */}
            <Route
              path="/ai-forecasting"
              element={<AIForecasting />}
            />

            {/* Surplus Food */}
            <Route
              path="/surplus"
              element={<SurplusListings />}
            />

            <Route
              path="/pickups"
              element={<BusinessPickups />}
            />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

          </Route>
        </Route>


        {/* =========================
            UNKNOWN ROUTES
        ========================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}