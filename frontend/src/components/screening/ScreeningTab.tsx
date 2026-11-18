import type { DemoExample, PredictionResult, ViewerLayerKey } from "../../types/mydria";
import { OpticalApertureViewer } from "./OpticalApertureViewer";
import { TelemetryReadout } from "./TelemetryReadout";

interface ScreeningTabProps {
  examples: DemoExample[];
  prediction: PredictionResult | null;
  selectedName: string;
  rejectedPreviewUrl: string | null;
  activeLayer: ViewerLayerKey;
  onSelectLayer: (layer: ViewerLayerKey) => void;
  isLoading: boolean;
  loadingStep: number;
  networkError: string | null;
  onSelectFile: (file: File) => void;
  onSelectExample: (ex: DemoExample) => void;
  onReset: () => void;
}

export function ScreeningTab({
  examples,
  prediction,
  selectedName,
  rejectedPreviewUrl,
  activeLayer,
  onSelectLayer,
  isLoading,
  loadingStep,
  networkError,
  onSelectFile,
  onSelectExample,
  onReset,
}: ScreeningTabProps) {
  return (
    <div>
      <h1 className="visually-hidden">Pemeriksaan Citra Fundus Retina Mydria</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] lg:gap-0">
        <div className="border-b border-[var(--border-hairline)] pb-6 lg:border-r lg:border-b-0 lg:pr-10 lg:pb-0">
          <div className="lg:sticky lg:top-16">
            <OpticalApertureViewer
              examples={examples}
              prediction={prediction}
              selectedName={selectedName}
              rejectedPreviewUrl={rejectedPreviewUrl}
              activeLayer={activeLayer}
              onSelectLayer={onSelectLayer}
              onSelectFile={onSelectFile}
              onSelectExample={onSelectExample}
              isLoading={isLoading}
              loadingStep={loadingStep}
            />
          </div>
        </div>

        <div className="lg:pl-10">
          <TelemetryReadout
            prediction={prediction}
            networkError={networkError}
            onReset={onReset}
          />
        </div>
      </div>
    </div>
  );
}
