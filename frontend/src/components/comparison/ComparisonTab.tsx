import { useComparisons } from "../../hooks/useComparisons";
import { ComparisonTableCard } from "./ComparisonTableCard";

interface ComparisonTabProps {
  active: boolean;
}

export function ComparisonTab({ active }: ComparisonTabProps) {
  const { data, isLoading, error } = useComparisons(active);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1
          className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
        >
          Komparasi Eksperimen & Audit Data
        </h1>
        <p className="m-0 text-sm text-[var(--text-secondary)]">
          Seluruh metrik di bawah dibaca langsung dari artefak Kaggle (<code>outputs/</code>); tanpa angka tiruan.
        </p>
      </div>

      {isLoading ? (
        <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-5">
          <p className="m-0 text-sm text-[var(--text-secondary)]">Memuat ringkasan metrik...</p>
        </section>
      ) : null}

      {error ? (
        <section
          role="alert"
          className="rounded-[18px] border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-sm text-[var(--error-fg)]"
        >
          {error}
        </section>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                Status Dataset & Siklus Pelatihan Aktif
              </h2>
              <span
                className="rounded-[12px] px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: data.stage === "full" ? "var(--grade-0-bg)" : "var(--warning-bg)",
                  color: data.stage === "full" ? "var(--grade-0-fg)" : "var(--warning-fg)",
                }}
              >
                {data.stage === "full"
                  ? "Pelatihan Penuh (15 Epoch)"
                  : "Mode Uji Smoke (75 Citra, 2 Epoch — Pelatihan Penuh Berjalan di Kaggle)"}
              </span>
            </div>

            {data.audit_summary ? (
              <dl className="tabular-nums mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Total Citra Valid APTOS</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {data.audit_summary.valid_images.toLocaleString("id-ID")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Klaster Duplikat (pHash+dHash)</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {data.audit_summary.num_duplicate_clusters} ({data.audit_summary.images_in_duplicate_clusters} citra)
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Klaster Konflik Label</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {data.audit_summary.num_label_conflict_clusters} ({data.audit_summary.images_in_label_conflict_clusters} citra)
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Split Test / Train-CV</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {data.audit_summary.split_counts.test ?? 0} / {data.audit_summary.split_counts.train_cv ?? 0}
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>

          <ComparisonTableCard
            title="E1: Ablasi Prapemrosesan Citra"
            caption="Perbandingan empat metode prapemrosesan pada validation QWK, Macro-F1, dan Recall kelas Mild."
            rows={data.e1_preprocessing}
            columns={[
              { key: "experiment", label: "Eksperimen" },
              { key: "preprocess_mode", label: "Mode" },
              { key: "val_qwk", label: "Val QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Macro-F1", numeric: true, decimals: 4 },
              { key: "mild_recall", label: "Recall Mild", numeric: true, decimals: 4 },
            ]}
          />

          <ComparisonTableCard
            title="E2: Perbandingan Lintas Generasi Backbone"
            caption="Perbandingan ResNet-50, EfficientNet-B0, dan ConvNeXt-V2-Tiny pada validation QWK dan AUROC Referable DR."
            rows={data.e2_backbones}
            columns={[
              { key: "experiment", label: "Eksperimen" },
              { key: "backbone", label: "Backbone" },
              { key: "val_qwk", label: "Val QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Macro-F1", numeric: true, decimals: 4 },
              { key: "referable_auroc", label: "Referable AUROC", numeric: true, decimals: 4 },
            ]}
          />

          <ComparisonTableCard
            title="E3: Fungsi Loss Ordinal, Penyeimbangan Tunggal, & Kalibrasi ECE"
            caption="Perbandingan Cross-Entropy polos, Cross-Entropy berbobot tunggal, CORN ordinal, dan Smooth L1."
            rows={data.e3_losses}
            columns={[
              { key: "experiment", label: "Eksperimen" },
              { key: "head_type", label: "Kepala Model" },
              { key: "val_qwk", label: "Val QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Macro-F1", numeric: true, decimals: 4 },
              { key: "ece", label: "ECE", numeric: true, decimals: 4 },
            ]}
          />

          {data.e4_test_metrics ? (
            <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
              <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                E4: Evaluasi Held-Out Test Set (Fold 0)
              </h2>
              <dl className="tabular-nums mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Test QWK</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.qwk ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Macro-F1</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.macro_f1 ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Akurasi</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {((data.e4_test_metrics.accuracy ?? 0) * 100).toFixed(1)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Referable AUROC</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.referable_dr?.auroc ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Kalibrasi ECE</dt>
                  <dd className="m-0 mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.ece ?? 0).toFixed(4)}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
