import { useLocation, useNavigate } from "react-router-dom";

function InventoryEntryNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isManual = location.pathname === "/inventory/add";
  const isCSV = location.pathname === "/csv-upload";
  const isScanner = location.pathname === "/scanner";

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

        {/* Manual Entry */}
        <button
          type="button"
          onClick={() => navigate("/inventory/add")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            isManual
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-base">✎</span>
          <span>Manual Entry</span>
        </button>


        {/* CSV Upload */}
        <button
          type="button"
          onClick={() => navigate("/csv-upload")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            isCSV
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-base">↑</span>
          <span>CSV Upload</span>
        </button>


        {/* Scanner */}
        <button
          type="button"
          onClick={() => navigate("/scanner")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            isScanner
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-base">▣</span>
          <span>Barcode / QR Scanner</span>
        </button>

      </div>
    </div>
  );
}

export default InventoryEntryNav;
