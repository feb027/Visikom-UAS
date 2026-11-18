import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "color-scheme";

function getSystemScheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredScheme(): "light" | "dark" | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === "light" || val === "dark" ? val : null;
  } catch {
    return null;
  }
}

function syncDocumentMeta(stored: "light" | "dark" | null): void {
  const meta = document.querySelector('meta[name="color-scheme"]');
  const contentVal = stored ?? "light dark";
  if (meta) {
    meta.setAttribute("content", contentVal);
  }
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/**
 * Kelola preferensi skema warna dua-status ala panduan dark-mode-toggle:
 * mengikuti OS secara default dan hanya menyimpan override jika berbeda dengan OS.
 */
export function useColorScheme() {
  const [stored, setStored] = useState<"light" | "dark" | null>(() => readStoredScheme());
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(() => getSystemScheme());

  const activeScheme = stored ?? systemScheme;

  useEffect(() => {
    syncDocumentMeta(stored);
  }, [stored]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMqChange = () => setSystemScheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onMqChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStored(readStoredScheme());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mq.removeEventListener("change", onMqChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleScheme = useCallback(() => {
    const currentRendered = stored ?? getSystemScheme();
    const target = currentRendered === "dark" ? "light" : "dark";
    const osNow = getSystemScheme();

    if (target === osNow) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Abaikan jika penyimpanan lokal dibatasi browser.
      }
      setStored(null);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, target);
      } catch {
        // Tema tetap diterapkan di DOM walau localStorage gagal.
      }
      setStored(target);
    }
  }, [stored]);

  return { activeScheme, isOverridden: stored !== null, toggleScheme };
}
