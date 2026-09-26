import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// ============================================================
// TENANT / BUSINESS PAGES
// ============================================================

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
import BusinessPickups from "./pages/BusinessPickups";

// ============================================================
// AUTH PAGES
// ============================================================

import Login from "./pages/auth/Login";
import TenantSignup from "./pages/auth/TenantSignup";
import NgoSignup from "./pages/auth/NgoSignup";
import Pending from "./pages/auth/Pending";

// ============================================================
// ADMIN PAGES
// ============================================================

import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountReview from "./pages/admin/AccountReview";

// ============================================================
// NGO PAGES
// ============================================================

import NGODashboard from "./pages/ngo/NGODashboard";
import NGORequirements from "./pages/ngo/NGORequirements";
import NGOMatches from "./pages/ngo/NGOMatches";

// ============================================================
// SHARED PAGES
// ============================================================

import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ======================================================
            PUBLIC / AUTH
        ====================================================== */}

        {/* Open application */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

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

        {/* ======================================================
            ADMIN
        ====================================================== */}

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

        {/* ======================================================
            NGO
        ====================================================== */}

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

            <Route
              path="/ngo/matches"
              element={<NGOMatches />}
            />

          </Route>
        </Route>

        {/* ======================================================
            SHARED PROFILE
            Available to both TENANT and NGO
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["TENANT", "NGO"]}
            />
          }
        >
          <Route element={<Layout />}>

            <Route
              path="/profile"
              element={<Profile />}
            />

          </Route>
        </Route>

        {/* ======================================================
            TENANT / BUSINESS
        ====================================================== */}

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

            {/* INVENTORY */}

            <Route
              path="/inventory"
              element={<Inventory />}
            />

            <Route
              path="/inventory/add"
              element={<AddInventory />}
            />

            {/* OTHER INVENTORY FEATURES */}

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

            {/* POS */}

            <Route
              path="/pos"
              element={<POSIntegration />}
            />

            {/* AI FORECASTING */}

            <Route
              path="/ai-forecasting"
              element={<AIForecasting />}
            />

            {/* SURPLUS FOOD */}

            <Route
              path="/surplus"
              element={<SurplusListings />}
            />

            {/* BUSINESS PICKUPS */}

            <Route
              path="/pickups"
              element={<BusinessPickups />}
            />

            {/* TRANSACTIONS */}

            <Route
              path="/transactions"
              element={<Transactions />}
            />

          </Route>
        </Route>

        {/* ======================================================
            UNKNOWN ROUTES
        ====================================================== */}

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