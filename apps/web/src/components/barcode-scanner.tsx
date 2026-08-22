"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BarcodeDetectorLike = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

declare global {
  interface Window { BarcodeDetector?: BarcodeDetectorConstructor }
}

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("Camera not started");
  const [scanning, setScanning] = useState(false);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("Camera access is not supported in this browser. Enter the barcode below."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
      if (!window.BarcodeDetector) { setStatus("Camera is on. Automatic barcode detection is unavailable here; enter the UPC/EAN manually."); return; }
      setStatus("Point the camera at the barcode…");
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            router.push(`/search?q=${encodeURIComponent(value)}`);
            return;
          }
        } catch { /* keep scanning */ }
        if (streamRef.current?.active) window.setTimeout(scan, 350);
      };
      void scan();
    } catch {
      setStatus("Camera permission was denied or unavailable. Enter the barcode below.");
    }
  }

  return <div className="panel" style={{ maxWidth:760 }}>
    <video ref={videoRef} playsInline muted style={{ width:"100%", aspectRatio:"16/9", borderRadius:16, background:"#020810", objectFit:"cover" }} />
    <p className="muted">{status}</p>
    {!scanning ? <button className="primary-button" onClick={start}>Start camera</button> : null}
    <form style={{ marginTop:18 }} onSubmit={(event) => { event.preventDefault(); const value=manual.trim(); if(value) router.push(`/search?q=${encodeURIComponent(value)}`); }}>
      <div className="search-box" style={{ margin:0 }}>
        <input value={manual} onChange={(event) => setManual(event.target.value.replace(/[^0-9A-Za-z-]/g,""))} placeholder="Or type UPC / EAN / model number" aria-label="Barcode or product code" />
        <button className="secondary-button" type="submit">Compare</button>
      </div>
    </form>
  </div>;
}
