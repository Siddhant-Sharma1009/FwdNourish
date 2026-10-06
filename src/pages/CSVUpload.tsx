import { useState, useRef } from "react";
import { uploadInventoryCSV } from "../services/csvApi";

type UploadResult = Awaited<ReturnType<typeof uploadInventoryCSV>>;

function CSVUpload() {
  const tenantId = 1;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function validateAndSetFile(selectedFile: File | undefined) {
    setResult(null);
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid CSV file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    validateAndSetFile(event.target.files?.[0]);
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (uploading) return;

    validateAndSetFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
  }

  function handleClearFile() {
    setFile(null);
    setError("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setResult(null);

      const response = await uploadInventoryCSV(
        tenantId,
        file
      );

      setResult(response);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err: unknown) {
      console.error(err);

      const errorDetail =
        err &&
        typeof err === "object" &&
        "response" in err
          ? (
              err as {
                response?: {
                  data?: {
                    detail?: string;
                  };
                };
              }
            ).response?.data?.detail
          : null;

      setError(
        typeof errorDetail === "string"
          ? errorDetail
          : "CSV upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        

        {/* ================= ERROR ALERT ================= */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4M12 16h.01"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-rose-900">
                Upload failed
              </p>
              <p className="mt-0.5 text-xs text-rose-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ================= UPLOAD CARD ================= */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">

          {/* Card Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 9h8M8 13h8M8 17h4"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Upload Inventory CSV
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a CSV file or drag and drop it below.
                </p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-5 sm:p-7">

            {/* ================= DROP ZONE ================= */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="group flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/20"
            >
              {/* Upload Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16V4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 9l5-5 5 5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"
                  />
                </svg>
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Drop your CSV file here
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                or choose a file from your computer
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Only .csv files are supported
              </p>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />

              {/* ================= SELECTED FILE ================= */}
              {file && (
                <div className="mt-6 w-full max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left shadow-sm">
                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 3h8l4 4v14H6V3z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 3v5h5"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Selected File
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearFile}
                      disabled={uploading}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* ================= ACTIONS ================= */}
              <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row">

                <label
                  htmlFor="csv-file-input"
                  className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-within:outline-none focus-within:ring-4 focus-within:ring-emerald-50"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16V4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 9l5-5 5 5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 20h14"
                    />
                  </svg>

                  {file ? "Choose Different File" : "Select CSV File"}
                </label>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {uploading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>

                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 16V4"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 9l5-5 5 5"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 20h14"
                        />
                      </svg>

                      Upload Inventory
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ================= CSV FORMAT INFORMATION ================= */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-600">
                  i
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">
                    Required CSV Format
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Your CSV file should contain the following columns in the
                    expected format.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <code className="block min-w-max rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200 shadow-sm">
                  sku,name,category_id,quantity,unit,batch_number,purchase_date,expiry_date,expiry_threshold_days
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* ================= UPLOAD RESULT ================= */}
        {result && (
          <div
            ref={resultRef}
            className="scroll-mt-6 overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm"
          >
            {/* Result Header */}
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-base font-bold text-emerald-900">
                    Import Completed
                  </h2>

                  <p className="mt-0.5 text-sm text-emerald-700">
                    Your CSV file has been processed.
                  </p>
                </div>
              </div>
            </div>

            {/* Result Content */}
            <div className="p-5 sm:p-7">

              {/* Result Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Successfully Inserted */}
                <div className="group rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 transition-all hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Successfully Inserted
                      </p>

                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-800">
                        {result.inserted}
                      </p>

                      <p className="mt-1 text-xs text-emerald-700">
                        Inventory records added
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Failed Rows */}
                <div className="group rounded-2xl border border-rose-200 bg-rose-50/60 p-5 transition-all hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        Failed Rows
                      </p>

                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-rose-800">
                        {result.failed}
                      </p>

                      <p className="mt-1 text-xs text-rose-700">
                        Records requiring correction
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4M12 16h.01"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= IMPORT ERRORS ================= */}
              {result.errors.length > 0 && (
                <div className="mt-7">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Import Errors
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Review the following rows before uploading again.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {result.errors.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 transition hover:border-rose-300"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xs font-bold text-rose-700">
                              {item.row}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-rose-900">
                                Row {item.row}
                                {item.sku ? ` — ${item.sku}` : ""}
                              </p>

                              <p className="mt-0.5 text-xs text-rose-600">
                                This record could not be imported.
                              </p>
                            </div>
                          </div>

                          <span className="w-fit rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                            Failed
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl border border-rose-100 bg-white/70 px-3 py-2.5">
                          <p className="text-sm leading-5 text-rose-700">
                            {item.error}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= UPLOAD ANOTHER ================= */}
              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  You can upload another CSV after reviewing this import.
                </p>

                <button
                  type="button"
                  onClick={handleClearFile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3a9 9 0 109 9"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v5h5"
                    />
                  </svg>

                  Upload Another CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CSVUpload;