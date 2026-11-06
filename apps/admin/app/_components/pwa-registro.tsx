"use client";

import { useEffect } from "react";

/**
 * Registra el service worker. Solo en producción: en `next dev` interfiere con
 * HMR y muestra resultados que no son los del despliegue.
 */
export function PwaRegistro() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker el portal funciona igual, solo no es instalable.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}
