"use client";

import { useEffect, useId, useState } from "react";

let loaderPromise: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load model-viewer"));
      document.head.appendChild(script);
    });
  }
  return loaderPromise;
}

interface Props {
  src: string;
  alt?: string;
  className?: string;
  autoRotate?: boolean;
}

export function GearModelViewer({
  src,
  alt = "3D gear model",
  className = "",
  autoRotate = true,
}: Props) {
  const reactId = useId();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadModelViewer()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-[var(--border)] bg-forest/40 text-sm text-sage ${className}`}
      >
        Couldn’t load 3D viewer
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-[var(--border)] bg-forest/40 ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl ${className}`}>
      <model-viewer
        key={`${reactId}-${src}`}
        src={src}
        alt={alt}
        camera-controls
        touch-action="pan-y"
        {...(autoRotate ? { "auto-rotate": true } : {})}
        shadow-intensity="0.85"
        exposure="1.05"
        loading="eager"
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at 50% 70%, rgba(90,125,98,0.35), rgba(13,18,13,0.95))",
        }}
      />
    </div>
  );
}
