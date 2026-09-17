import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Layout from "./components/layout/Layout";

import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddInventory from "./pages/AddInventory";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import CSVUpload from "./pages/CSVUpload";
import Scanner from "./pages/Scanner";
import POSIntegration from "./pages/POSIntegration";
import Donations from "./pages/Donations";
import Transactions from "./pages/Transactions";


function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route element={<Layout />}>

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/inventory"
            element={<Inventory />}
          />

          <Route
            path="/inventory/add"
            element={<AddInventory />}
          />

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

          <Route
            path="/donations"
            element={<Donations />}
          />

          <Route
            path="/transactions"
            element={<Transactions />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}


export default App;