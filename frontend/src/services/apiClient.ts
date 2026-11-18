import type { ComparisonsResponse, DemoExample, HealthResponse, PredictionResult } from "../types/mydria";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Permintaan gagal (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Gunakan pesan status HTTP bawaan jika respons bukan JSON.
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  return parseJsonOrThrow<HealthResponse>(res);
}

export async function fetchExamples(): Promise<DemoExample[]> {
  const res = await fetch("/api/examples");
  const data = await parseJsonOrThrow<{ examples: DemoExample[] }>(res);
  return data.examples;
}

export async function fetchComparisons(): Promise<ComparisonsResponse> {
  const res = await fetch("/api/metrics");
  return parseJsonOrThrow<ComparisonsResponse>(res);
}

export async function predictUpload(file: File): Promise<PredictionResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/predict", {
    method: "POST",
    body: form,
  });
  return parseJsonOrThrow<PredictionResult>(res);
}

export async function predictExample(exampleId: string): Promise<PredictionResult> {
  const res = await fetch(`/api/predict?example_id=${encodeURIComponent(exampleId)}`, {
    method: "POST",
  });
  return parseJsonOrThrow<PredictionResult>(res);
}
