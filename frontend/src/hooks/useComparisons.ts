import { useEffect, useState } from "react";
import { fetchComparisons } from "../services/apiClient";
import type { ComparisonsResponse } from "../types/mydria";

export function useComparisons(active: boolean) {
  const [data, setData] = useState<ComparisonsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || data !== null) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void fetchComparisons()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat metrik eksperimen.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, data]);

  return { data, isLoading, error };
}
