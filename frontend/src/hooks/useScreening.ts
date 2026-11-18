import { useCallback, useEffect, useState } from "react";
import { fetchExamples, fetchHealth, predictExample, predictUpload } from "../services/apiClient";
import type { DemoExample, HealthResponse, PredictionResult, ViewerLayerKey } from "../types/mydria";

export const LOADING_STEPS = [
  "1. Validasi domain fundus & ketajaman OpenCV",
  "2. Prapemrosesan Circle Crop & Lab-CLAHE",
  "3. Inferensi ONNX Runtime & peta Grad-CAM++",
];

export function useScreening() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [examples, setExamples] = useState<DemoExample[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [rejectedPreviewUrl, setRejectedPreviewUrl] = useState<string | null>(null);
  const [layer, setLayer] = useState<ViewerLayerKey>("gradcam_overlay");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    void fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
    void fetchExamples()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const t1 = window.setTimeout(() => setLoadingStep(1), 220);
    const t2 = window.setTimeout(() => setLoadingStep(2), 520);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isLoading]);

  const runWithTracking = useCallback(
    async (label: string, fallbackPreviewUrl: string | null, task: () => Promise<PredictionResult>) => {
      setIsLoading(true);
      setNetworkError(null);
      setSelectedName(label);
      setRejectedPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      try {
        const res = await task();
        setPrediction(res);
        if (res.accepted) {
          setLayer("gradcam_overlay");
          if (fallbackPreviewUrl && fallbackPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(fallbackPreviewUrl);
          }
        } else {
          setRejectedPreviewUrl(fallbackPreviewUrl);
        }
      } catch (err) {
        if (fallbackPreviewUrl && fallbackPreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(fallbackPreviewUrl);
        }
        setPrediction(null);
        setNetworkError(err instanceof Error ? err.message : "Gagal menghubungi server inferensi.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const analyzeFile = useCallback(
    (file: File) => {
      const localUrl = URL.createObjectURL(file);
      void runWithTracking(file.name, localUrl, () => predictUpload(file));
    },
    [runWithTracking]
  );

  const analyzeExample = useCallback(
    (example: DemoExample) => {
      void runWithTracking(example.label, example.image_url, () => predictExample(example.id));
    },
    [runWithTracking]
  );

  const resetScreening = useCallback(() => {
    setPrediction(null);
    setNetworkError(null);
    setSelectedName("");
    setRejectedPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return {
    health,
    examples,
    prediction,
    selectedName,
    rejectedPreviewUrl,
    layer,
    setLayer,
    isLoading,
    loadingStep,
    networkError,
    analyzeFile,
    analyzeExample,
    resetScreening,
  };
}
