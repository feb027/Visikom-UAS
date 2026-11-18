interface BraunBarSectionProps {
  indexTag: string;
  title: string;
  rows: Array<Record<string, string | number>>;
  nameKey: string;
  primaryKey: string;
  primaryLabel: string;
  secondaryKeys?: Array<{ key: string; label: string }>;
}

/**
 * Daftar perbandingan berbilah sinyal horizontal gaya Braun:
 * pas di layar ponsel sempit tanpa scroll samping dan sejajar rapi 3 kolom di desktop.
 */
export function ComparisonTableCard({
  indexTag,
  title,
  rows,
  nameKey,
  primaryKey,
  primaryLabel,
  secondaryKeys = [],
}: BraunBarSectionProps) {
  const maxVal = Math.max(
    0.001,
    ...rows.map((r) => (typeof r[primaryKey] === "number" ? (r[primaryKey] as number) : 0))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">
            {indexTag}
          </span>
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{primaryLabel}</span>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-[var(--text-secondary)]">
          Berkas metrik belum tersedia.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-4 p-0">
          {rows.map((row, idx) => {
            const val = typeof row[primaryKey] === "number" ? (row[primaryKey] as number) : 0;
            const isWinner = idx === 0;
            const pct = Math.max(8, Math.min(100, (val / maxVal) * 100));
            const labelText = String(row[nameKey] ?? row.experiment ?? "-");

            return (
              <li
                key={String(row.experiment ?? idx)}
                className={`space-y-1.5 ${
                  isWinner ? "border-l-2 border-[var(--accent-signal)] pl-3" : "pl-3.5"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-sm ${
                      isWinner
                        ? "font-semibold text-[var(--text-primary)]"
                        : "font-medium text-[var(--text-primary)]"
                    }`}
                  >
                    {labelText}
                  </span>
                  <span
                    className={`tabular-nums shrink-0 text-sm ${
                      isWinner
                        ? "font-bold text-[var(--accent-signal)]"
                        : "font-semibold text-[var(--text-primary)]"
                    }`}
                  >
                    {val.toFixed(3)}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-recessed)]">
                  <div
                    className="mydria-smooth-pos h-full rounded-full"
                    style={{
                      width: `${pct.toFixed(1)}%`,
                      backgroundColor: isWinner ? "var(--accent-signal)" : "var(--text-secondary)",
                      opacity: isWinner ? 1 : 0.6,
                    }}
                  />
                </div>

                {secondaryKeys.length > 0 ? (
                  <p className="tabular-nums m-0 text-[11px] text-[var(--text-secondary)]">
                    {secondaryKeys
                      .map((sk) => {
                        const raw = row[sk.key];
                        const fmt = typeof raw === "number" ? raw.toFixed(3) : String(raw ?? "-");
                        return `${sk.label}: ${fmt}`;
                      })
                      .join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
