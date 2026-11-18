import { useComparisons } from "../../hooks/useComparisons";
import { ComparisonTableCard } from "./ComparisonTableCard";

interface ComparisonTabProps {
  active: boolean;
}

export function ComparisonTab({ active }: ComparisonTabProps) {
  const { data, isLoading, error } = useComparisons(active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1
            className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
          >
            Komparasi Eksperimen
          </h1>
          <p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">
            Rekaman riil pelatihan APTOS 2019 pada Kaggle T4 GPU.
          </p>
        </div>

        {data ? (
          <span
            className="tabular-nums text-xs font-semibold"
            style={{
              color: data.stage === "full" ? "var(--grade-0-fg)" : "var(--accent-signal)",
            }}
          >
            {data.stage === "full"
              ? "Hasil Final (15 Epoch)"
              : "Mode Smoke (75 Citra · 2 Epoch)"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="border-t border-[var(--border-hairline)] pt-5 text-sm text-[var(--text-secondary)]">
          Memuat data eksperimen...
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="border-t border-[var(--error-fg)] pt-4 text-sm text-[var(--error-fg)]">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {data.audit_summary ? (
            <div className="border-t border-[var(--border-hairline)] pt-5">
              <div className="flex items-baseline gap-2.5">
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">00</span>
                <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                  Audit APTOS 2019 (pHash &amp; dHash)
                </h2>
              </div>
              <dl className="tabular-nums mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--border-hairline)]">
                <div className="sm:pr-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Citra Valid</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {data.audit_summary.valid_images.toLocaleString("id-ID")}
                  </dd>
                </div>
                <div className="sm:px-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Klaster Duplikat</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {data.audit_summary.num_duplicate_clusters}
                  </dd>
                </div>
                <div className="sm:px-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Konflik Label</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {data.audit_summary.num_label_conflict_clusters}
                  </dd>
                </div>
                <div className="sm:pl-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Test / Train-CV</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {data.audit_summary.split_counts.test ?? 0} / {data.audit_summary.split_counts.train_cv ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-7 border-t border-[var(--border-hairline)] pt-5 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-[var(--border-hairline)]">
            <div className="lg:pr-6">
              <ComparisonTableCard
                indexTag="01"
                title="Prapemrosesan"
                rows={data.e1_preprocessing}
                nameKey="preprocess_mode"
                primaryKey="val_qwk"
                primaryLabel="Val QWK"
                secondaryKeys={[
                  { key: "val_macro_f1", label: "Macro-F1" },
                  { key: "mild_recall", label: "Recall Mild" },
                ]}
              />
            </div>

            <div className="border-t border-[var(--border-hairline)] pt-5 lg:border-t-0 lg:px-6 lg:pt-0">
              <ComparisonTableCard
                indexTag="02"
                title="Backbone"
                rows={data.e2_backbones}
                nameKey="backbone"
                primaryKey="val_qwk"
                primaryLabel="Val QWK"
                secondaryKeys={[
                  { key: "val_macro_f1", label: "Macro-F1" },
                  { key: "referable_auroc", label: "AUROC" },
                ]}
              />
            </div>

            <div className="border-t border-[var(--border-hairline)] pt-5 lg:border-t-0 lg:pl-6 lg:pt-0">
              <ComparisonTableCard
                indexTag="03"
                title="Fungsi Loss"
                rows={data.e3_losses}
                nameKey="experiment"
                primaryKey="val_qwk"
                primaryLabel="Val QWK"
                secondaryKeys={[
                  { key: "val_macro_f1", label: "Macro-F1" },
                  { key: "ece", label: "ECE" },
                ]}
              />
            </div>
          </div>

          {data.e4_test_metrics ? (
            <div className="border-t border-[var(--border-hairline)] pt-5">
              <div className="flex items-baseline gap-2.5">
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">04</span>
                <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                  Uji Akhir Held-Out (Fold 0)
                </h2>
              </div>
              <dl className="tabular-nums mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--border-hairline)]">
                <div className="sm:pr-5">
                  <dt className="text-xs text-[var(--text-secondary)]">QWK</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {(data.e4_test_metrics.qwk ?? 0).toFixed(3)}
                  </dd>
                </div>
                <div className="sm:px-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Macro-F1</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {(data.e4_test_metrics.macro_f1 ?? 0).toFixed(3)}
                  </dd>
                </div>
                <div className="sm:px-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Referable AUROC</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {(data.e4_test_metrics.referable_dr?.auroc ?? 0).toFixed(3)}
                  </dd>
                </div>
                <div className="sm:pl-5">
                  <dt className="text-xs text-[var(--text-secondary)]">Kalibrasi ECE</dt>
                  <dd className="m-0 mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                    {(data.e4_test_metrics.ece ?? 0).toFixed(3)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
