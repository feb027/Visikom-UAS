import type { ChangeEvent } from "react";
import { RotateCcw, Upload } from "lucide-react";
import type { DemoExample } from "../../types/mydria";

interface UploadControlsProps {
  examples: DemoExample[];
  isLoading: boolean;
  hasResult: boolean;
  onSelectFile: (file: File) => void;
  onSelectExample: (ex: DemoExample) => void;
  onReset: () => void;
}

export function UploadControls({
  examples,
  isLoading,
  hasResult,
  onSelectFile,
  onSelectExample,
  onReset,
}: UploadControlsProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    e.target.value = "";
  };

  return (
    <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label
          htmlFor="fundus-file-input"
          className={`inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] px-4 py-3 text-sm font-semibold text-[var(--accent-button-text)] transition-opacity ${
            isLoading ? "pointer-events-none opacity-65" : "hover:opacity-90"
          }`}
          style={{ backgroundColor: "var(--accent-button-bg)" }}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>Pilih Citra Fundus (PNG/JPG)</span>
        </label>
        <input
          id="fundus-file-input"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="visually-hidden"
          disabled={isLoading}
        />

        {hasResult ? (
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface-2)] px-3.5 text-sm font-medium text-[var(--text-primary)] hover:opacity-85 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Atur Ulang</span>
          </button>
        ) : null}
      </div>

      {examples.length > 0 ? (
        <div className="mt-4">
          <p className="m-0 mb-2 text-xs font-medium text-[var(--text-secondary)]">
            Atau uji langsung memakai sampel held-out APTOS 2019 (tanpa perlu siapkan berkas):
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {examples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                disabled={isLoading || !ex.available}
                onClick={() => onSelectExample(ex)}
                className="flex min-h-11 cursor-pointer flex-col items-start justify-center rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface-2)] px-3 py-2 text-left text-[var(--text-primary)] transition-colors hover:border-[var(--accent-link)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-xs font-semibold">{ex.short_label}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
