import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { QualityReport } from "../../types/mydria";

interface QualityGateCardProps {
  quality: QualityReport;
}

export function QualityGateCard({ quality }: QualityGateCardProps) {
  const isRejected = !quality.accepted;
  const hasBlurWarning = quality.accepted && quality.blur_warning;

  return (
    <section
      aria-live={isRejected ? "assertive" : "polite"}
      className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4"
    >
      <div className="flex items-start gap-3">
        {isRejected ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--error-fg)]" aria-hidden="true" />
        ) : hasBlurWarning ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning-fg)]" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--grade-0-fg)]" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-sm font-semibold text-[var(--text-primary)]">
            Gerbang Kualitas & Domain OpenCV
          </h2>
          <p
            className="m-0 mt-1 text-sm"
            style={{
              color: isRejected
                ? "var(--error-fg)"
                : hasBlurWarning
                  ? "var(--warning-fg)"
                  : "var(--text-secondary)",
            }}
          >
            {quality.message_id}
          </p>
        </div>
      </div>

      <dl className="tabular-nums mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-hairline)] pt-3 text-xs">
        <div>
          <dt className="text-[var(--text-secondary)]">Ketajaman (Laplacian)</dt>
          <dd className="m-0 mt-0.5 font-semibold text-[var(--text-primary)]">
            {quality.laplacian_variance.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Rasio ROI Fundus</dt>
          <dd className="m-0 mt-0.5 font-semibold text-[var(--text-primary)]">
            {(quality.roi_area_ratio * 100).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Rasio R/B | R/G</dt>
          <dd className="m-0 mt-0.5 font-semibold text-[var(--text-primary)]">
            {quality.red_blue_ratio.toFixed(2)} | {quality.red_green_ratio.toFixed(2)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
