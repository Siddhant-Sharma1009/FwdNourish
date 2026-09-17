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
          qrbox: { width: 280, height: 180 },
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
      <div
        id="qr-barcode-reader"
        className="w-full overflow-hidden rounded-xl border bg-black"
      />

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {!scanning ? (
          <button
            type="button"
            onClick={startScanner}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Start Scanning
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700"
          >
            Stop Scanning
          </button>
        )}
      </div>

      {scanning && (
        <p className="text-sm text-green-600">
          Scanner is active. Keep scanning items — no need to press Start
          Scanning again.
        </p>
      )}
    </div>
  );
}