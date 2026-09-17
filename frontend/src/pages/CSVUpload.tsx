
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

      // Scroll to result after upload
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
    <div className="mx-auto w-full max-w-6xl space-y-6">

      {/* ================= ERROR ALERT ================= */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}



      {/* ================= UPLOAD CARD ================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Card Header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Upload Inventory CSV
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select a CSV file or drag and drop it below.
          </p>
        </div>


        {/* Card Content */}
        <div className="p-5">

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-5 py-8 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50/20"
          >

            {/* Upload Icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-semibold text-emerald-600">
              ↑
            </div>


            {/* Drop Zone Text */}
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Drop your CSV file here
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              or choose a file from your computer
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


            {/* Selected File */}
            {file && (
              <div className="mt-5 w-full max-w-xl rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-left">

                <div className="flex items-center justify-between gap-4">

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
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Change
                  </button>

                </div>
              </div>
            )}


            {/* Actions */}
            <div className="mt-5 flex w-full max-w-xl flex-col gap-3 sm:flex-row">

              <label
                htmlFor="csv-file-input"
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500"
              >
                {file ? "Choose Different File" : "Select CSV File"}
              </label>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >

                {uploading ? (
                  <span className="inline-flex items-center gap-2">

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

                  </span>
                ) : (
                  "Upload Inventory"
                )}

              </button>

            </div>

          </div>


          {/* ================= CSV FORMAT INFORMATION ================= */}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">

            <div className="flex items-start gap-3">

              {/* Info Icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">
                i
              </div>


              <div className="min-w-0">

                <h3 className="text-sm font-semibold text-slate-800">
                  Required CSV Format
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Your CSV file should contain the following columns.
                </p>

              </div>

            </div>


            {/* CSV Columns */}
            <div className="mt-3 overflow-x-auto">

              <code className="block min-w-max rounded-lg bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200">
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
          className="scroll-mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
        >

          {/* Result Header */}
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                ✓
              </div>

              <div>
                <h2 className="text-base font-bold text-emerald-900">
                  Import Completed
                </h2>

                <p className="mt-0.5 text-xs text-emerald-700">
                  Your CSV file has been processed.
                </p>
              </div>

            </div>
          </div>


          {/* Result Content */}
          <div className="p-5">

            {/* Result Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Successfully Inserted */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">

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


              {/* Failed Rows */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">

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

            </div>


            {/* Import Errors */}
            {result.errors.length > 0 && (
              <div className="mt-6">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Import Errors
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Review the following rows before uploading again.
                  </p>
                </div>
                <div className="space-y-2">
                 {result.errors.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-rose-200 bg-rose-50/50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-rose-900">
                          Row {item.row}
                          {item.sku ? ` — ${item.sku}` : ""}
                        </p>
                        <span className="w-fit rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                          Failed
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-rose-700">
                        {item.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Upload Another File */}
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">

              <button
                type="button"
                onClick={handleClearFile}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Upload Another CSV
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default CSVUpload;
