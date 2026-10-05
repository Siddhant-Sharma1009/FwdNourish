"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRBarcodeScannerProps {
  onScan: (code: string) => void;
}

export default function QRBarcodeScanner({
  onScan,
}: QRBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const scanLockRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const startScanner = async () => {
    if (scanning) return;

    setError("");

    try {
      const scanner = new Html5Qrcode("qr-barcode-reader");

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          // Adapts to narrow phone screens instead of a fixed 280x180 box.
          qrbox: (viewfinderWidth: number) => {
            const width = Math.min(280, viewfinderWidth - 32);
            return { width, height: Math.round(width * 0.64) };
          },
        },
        (decodedText) => {
          // Prevent the same barcode from firing repeatedly
          // while it remains in front of the camera.
          if (scanLockRef.current) return;

          scanLockRef.current = true;
          lastScannedRef.current = decodedText;

          onScan(decodedText);

          // Allow the same item to be scanned again after a short delay.
          setTimeout(() => {
            scanLockRef.current = false;
          }, 1000);
        },
        () => {
          // Ignore normal "barcode not detected" callbacks.
        }
      );

      setScanning(true);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to start camera. Please allow camera permission and try again."
      );
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      setScanning(false);
      scanLockRef.current = false;
      lastScannedRef.current = "";
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          });
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Scanner viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
        {/* Camera area */}
        <div
          id="qr-barcode-reader"
          className="min-h-[220px] w-full overflow-hidden bg-slate-950 sm:min-h-[260px] [&_video]:w-full [&_video]:object-cover"
        />

        {/* Scanner status badge */}
        <div className="pointer-events-none absolute left-3 top-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-md ${
              scanning
                ? "border-emerald-400/30 bg-emerald-950/70 text-emerald-300"
                : "border-white/10 bg-slate-900/80 text-slate-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                scanning
                  ? "animate-pulse bg-emerald-400"
                  : "bg-slate-500"
              }`}
            />

            {scanning ? "Scanner Active" : "Scanner Ready"}
          </div>
        </div>

        {/* Scan frame */}
        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-[14/9] w-[85%] max-w-[280px]">
              {/* Corner brackets */}
              <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 border-emerald-400" />
              <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 border-emerald-400" />
              <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-2 border-r-2 border-emerald-400" />

              {/* Scan line */}
              <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>
          </div>
        )}

        {/* Camera helper text */}
        {!scanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-white/10 bg-slate-900/75 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7h4l2-2h6l2 2h4v11H3V7z"
                  />
                  <circle cx="12" cy="12.5" r="3.5" />
                </svg>
              </div>

              <p className="text-xs font-semibold text-white">
                Camera scanner ready
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Start the scanner to detect a QR code or barcode
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scanner information (hidden on mobile to save space) */}
      <div className="hidden flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 8h8v8H8z"
              />
            </svg>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              QR & Barcode Scanner
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
              Point your camera at an item code to automatically add it to
              the sale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          Camera access required
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4M12 16h.01"
              />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Camera access failed</p>
            <p className="mt-0.5 text-xs leading-5 text-rose-600">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg p-2 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700"
            aria-label="Dismiss error"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5l10 10M15 5L5 15"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!scanning ? (
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:translate-y-0 sm:h-11 sm:flex-1 sm:text-sm sm:hover:-translate-y-0.5 sm:hover:shadow-md"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>

            Start Scanning
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-base font-semibold text-rose-600 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 active:translate-y-0 sm:h-11 sm:flex-1 sm:text-sm sm:hover:-translate-y-0.5 sm:hover:shadow-md"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100">
              <span className="h-2 w-2 rounded-sm bg-rose-500" />
            </span>

            Stop Scanning
          </button>
        )}
      </div>

      {/* Active scanner status (hidden on mobile; the camera badge shows it) */}
      {scanning && (
        <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:flex">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>

          <p className="text-xs font-medium text-emerald-800">
            Scanner is active. Keep scanning items — no need to press Start
            Scanning again.
          </p>
        </div>
      )}
    </div>
  );
}