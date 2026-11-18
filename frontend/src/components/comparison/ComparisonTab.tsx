import { useComparisons } from "../../hooks/useComparisons";
import { ComparisonTableCard } from "./ComparisonTableCard";

interface ComparisonTabProps {
  active: boolean;
}

export function ComparisonTab({ active }: ComparisonTabProps) {
  const { data, isLoading, error } = useComparisons(active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1
            className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
          >
            Komparasi &amp; Audit
          </h1>
          <p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">
            Angka riil keluaran Kaggle pada dataset APTOS 2019.
          </p>
        </div>

        {data ? (
          <span
            className="text-xs font-semibold"
            style={{
              color: data.stage === "full" ? "var(--grade-0-fg)" : "var(--accent-signal)",
            }}
          >
            {data.stage === "full"
              ? "Hasil Final (15 Epoch)"
              : "Mode Smoke (75 Citra · 2 Epoch — Pelatihan Penuh Berjalan di Kaggle)"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="border-t border-[var(--border-hairline)] pt-5 text-sm text-[var(--text-secondary)]">
          Memuat metrik eksperimen...
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
              <div className="flex items-baseline gap-3">
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">00</span>
                <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                  Audit Deduplikasi &amp; Partisi Bebas Bocor
                </h2>
              </div>
              <dl className="tabular-nums mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Citra Valid APTOS</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {data.audit_summary.valid_images.toLocaleString("id-ID")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Klaster Duplikat</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {data.audit_summary.num_duplicate_clusters}
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-secondary)]">
                      ({data.audit_summary.images_in_duplicate_clusters} citra)
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Konflik Label</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {data.audit_summary.num_label_conflict_clusters}
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-secondary)]">
                      ({data.audit_summary.images_in_label_conflict_clusters} citra)
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Test / Train-CV</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {data.audit_summary.split_counts.test ?? 0} / {data.audit_summary.split_counts.train_cv ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <ComparisonTableCard
            indexTag="01"
            title="Cara Menyiapkan Gambar (Prapemrosesan)"
            caption="Perbandingan empat metode prapemrosesan pada keselarasan skor QWK, Macro-F1, dan deteksi kasus ringan."
            rows={data.e1_preprocessing}
            columns={[
              { key: "experiment", label: "Uji" },
              { key: "preprocess_mode", label: "Mode" },
              { key: "val_qwk", label: "Skor QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Rata-rata F1", numeric: true, decimals: 4 },
              { key: "mild_recall", label: "Deteksi Ringan", numeric: true, decimals: 4 },
            ]}
          />

          <ComparisonTableCard
            indexTag="02"
            title="Perbandingan Arsitektur Model"
            caption="Perbandingan ResNet-50, EfficientNet-B0, dan ConvNeXt-V2-Tiny pada skor QWK dan AUROC kasus rujukan."
            rows={data.e2_backbones}
            columns={[
              { key: "experiment", label: "Uji" },
              { key: "backbone", label: "Arsitektur" },
              { key: "val_qwk", label: "Skor QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Rata-rata F1", numeric: true, decimals: 4 },
              { key: "referable_auroc", label: "Ketepatan Rujukan", numeric: true, decimals: 4 },
            ]}
          />

          <ComparisonTableCard
            indexTag="03"
            title="Fungsi Loss & Kalibrasi Keyakinan"
            caption="Perbandingan Cross-Entropy polos, Cross-Entropy berbobot tunggal, CORN ordinal, dan Smooth L1."
            rows={data.e3_losses}
            columns={[
              { key: "experiment", label: "Uji" },
              { key: "head_type", label: "Metode" },
              { key: "val_qwk", label: "Skor QWK", numeric: true, decimals: 4 },
              { key: "val_macro_f1", label: "Rata-rata F1", numeric: true, decimals: 4 },
              { key: "ece", label: "Galat Kalibrasi (ECE)", numeric: true, decimals: 4 },
            ]}
          />

          {data.e4_test_metrics ? (
            <div className="border-t border-[var(--border-hairline)] pt-5">
              <div className="flex items-baseline gap-3">
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">04</span>
                <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                  Evaluasi Held-Out Test Set (Fold 0)
                </h2>
              </div>
              <dl className="tabular-nums mt-4 grid grid-cols-2 gap-6 sm:grid-cols-5">
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Test QWK</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.qwk ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Macro-F1</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.macro_f1 ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Akurasi</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {((data.e4_test_metrics.accuracy ?? 0) * 100).toFixed(1)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Referable AUROC</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.referable_dr?.auroc ?? 0).toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Kalibrasi ECE</dt>
                  <dd className="m-0 mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {(data.e4_test_metrics.ece ?? 0).toFixed(4)}
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
