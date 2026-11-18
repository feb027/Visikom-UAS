export type NavTabId = "screening" | "comparison" | "methodology";

export type ViewerLayerKey = "original_crop" | "lab_clahe" | "ben_graham" | "gradcam_overlay";

export type ColorSchemePreference = "system" | "light" | "dark";

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_stage: "full" | "smoke" | "unavailable";
  backbone: string | null;
  head_type: string | null;
  preprocess_mode: string | null;
  input_size: number;
  active_provider: string | null;
  available_providers: string[];
  disclaimer: string;
}

export interface QualityReport {
  accepted: boolean;
  rejection_code: string | null;
  blur_warning: boolean;
  laplacian_variance: number;
  roi_area_ratio: number;
  red_blue_ratio: number;
  red_green_ratio: number;
  message_id: string;
}

export interface ClassProbability {
  grade: number;
  label: string;
  probability: number;
}

export interface ViewerLayers {
  original_crop: string;
  raw_resize: string;
  lab_clahe: string;
  ben_graham: string;
  gradcam_overlay: string;
}

export interface PredictionResult {
  accepted: boolean;
  quality: QualityReport;
  model_stage: string | null;
  backbone: string | null;
  head_type: string | null;
  preprocess_mode: string | null;
  active_provider: string | null;
  inference_ms: number | null;
  predicted_grade: number | null;
  predicted_label: string | null;
  referable_dr: boolean | null;
  referable_probability: number | null;
  confidence: number | null;
  temperature: number | null;
  guidance_id: string | null;
  disclaimer: string;
  probabilities: ClassProbability[];
  viewer_layers: ViewerLayers | null;
}

export interface DemoExample {
  id: string;
  label: string;
  short_label: string;
  expected_grade: number;
  split: string;
  available: boolean;
  image_url: string;
}

export interface AuditSummary {
  total_rows_csv: number;
  valid_images: number;
  invalid_images: number;
  unique_clusters: number;
  max_cluster_size: number;
  images_in_duplicate_clusters: number;
  num_duplicate_clusters: number;
  images_in_label_conflict_clusters: number;
  num_label_conflict_clusters: number;
  split_counts: Record<string, number>;
  fold_counts?: Record<string, number>;
}

export interface ComparisonsResponse {
  stage: "full" | "smoke" | "unavailable";
  audit_summary: AuditSummary | null;
  e1_preprocessing: Array<Record<string, string | number>>;
  e2_backbones: Array<Record<string, string | number>>;
  e3_losses: Array<Record<string, string | number>>;
  e4_test_metrics: {
    qwk?: number;
    accuracy?: number;
    macro_f1?: number;
    ece?: number;
    referable_dr?: {
      auroc?: number;
      sensitivity?: number;
      specificity?: number;
    };
  } | null;
  model_meta: Record<string, unknown> | null;
}
