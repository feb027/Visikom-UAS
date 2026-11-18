import type { PredictionResult } from "../../types/mydria";
import { SeverityBadge } from "../common/SeverityBadge";

interface SeverityDistributionCardProps {
  prediction: PredictionResult;
}

export function SeverityDistributionCard({ prediction }: SeverityDistributionCardProps) {
  const grade = prediction.predicted_grade ?? 0;
  const label = prediction.predicted_label ?? "No DR";
  const confidencePct = ((prediction.confidence ?? 0) * 100).toFixed(1);
  const referablePct = ((prediction.referable_probability ?? 0) * 100).toFixed(1);

  return (
    <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-medium text-[var(--text-secondary)]">
            Hasil Skrining Terkalibrasi
          </p>
          <h2 className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Grade {grade}: {label}
          </h2>
        </div>

        <div className="text-right">
          <p className="m-0 text-xs text-[var(--text-secondary)]">Kepercayaan Kelas</p>
          <p
            className="tabular-nums m-0 font-bold leading-none text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.75rem, 1.4rem + 1.2vw, 2.35rem)" }}
          >
            {confidencePct}%
          </p>
        </div>
      </div>

      <div className="mt-3">
        <SeverityBadge
          grade={grade}
          label={label}
          referable={Boolean(prediction.referable_dr)}
        />
      </div>

      <p className="m-0 mt-3 text-sm text-[var(--text-secondary)]">
        {prediction.guidance_id}
      </p>

      <div className="mt-4 space-y-2.5 border-t border-[var(--border-hairline)] pt-4">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
          <span>Distribusi Probabilitas 5 Tingkat</span>
          <span className="tabular-nums">Peluang Referable (&gt;=2): {referablePct}%</span>
        </div>

        {prediction.probabilities.map((item) => {
          const pct = Math.max(0, Math.min(100, item.probability * 100));
          const isPredicted = item.grade === grade;
          return (
            <div key={item.grade} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={isPredicted ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                  {item.grade}. {item.label}
                </span>
                <span className={`tabular-nums ${isPredicted ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-2)]">
                <div
                  className="mydria-bar-fill h-full rounded-full"
                  style={{
                    width: `${pct.toFixed(1)}%`,
                    backgroundColor: isPredicted ? "var(--accent-link)" : "var(--text-secondary)",
                    opacity: isPredicted ? 1 : 0.45,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <dl className="tabular-nums mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-hairline)] pt-3 text-xs lg:grid-cols-4">
        <div>
          <dt className="text-[var(--text-secondary)]">Backbone</dt>
          <dd className="m-0 mt-0.5 break-words font-semibold text-[var(--text-primary)]">
            {prediction.backbone ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Runtime ONNX</dt>
          <dd className="m-0 mt-0.5 break-words font-semibold text-[var(--text-primary)]">
            {prediction.active_provider?.replace("ExecutionProvider", "") ?? "CPU"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Latensi</dt>
          <dd className="m-0 mt-0.5 font-semibold text-[var(--text-primary)]">
            {prediction.inference_ms !== null ? `${prediction.inference_ms.toFixed(1)} ms` : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Suhu Kalibrasi T</dt>
          <dd className="m-0 mt-0.5 font-semibold text-[var(--text-primary)]">
            {prediction.temperature !== null ? prediction.temperature.toFixed(2) : "-"}
          </dd>
        </div>
      </dl>

      <p className="m-0 mt-4 rounded-[12px] bg-[var(--bg-surface-2)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
        {prediction.disclaimer}
      </p>
    </section>
  );
}
