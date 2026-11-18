interface ColumnDef {
  key: string;
  label: string;
  numeric?: boolean;
  decimals?: number;
}

interface ComparisonTableCardProps {
  title: string;
  caption: string;
  rows: Array<Record<string, string | number>>;
  columns: ColumnDef[];
}

export function ComparisonTableCard({ title, caption, rows, columns }: ComparisonTableCardProps) {
  return (
    <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
      <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      {rows.length === 0 ? (
        <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
          Berkas metrik untuk tahap ini belum tersedia di direktori keluaran.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="visually-hidden">{caption}</caption>
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2 pr-4 font-semibold ${col.numeric ? "text-right" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={String(row.experiment ?? rIdx)}
                  className="border-b border-[var(--border-hairline)] last:border-b-0"
                >
                  {columns.map((col, cIdx) => {
                    const val = row[col.key];
                    const formatted =
                      typeof val === "number" && col.numeric
                        ? val.toFixed(col.decimals ?? 4)
                        : String(val ?? "-");
                    const isFirst = cIdx === 0;
                    if (isFirst) {
                      return (
                        <th key={col.key} scope="row" className="py-2.5 pr-4 font-semibold text-[var(--text-primary)]">
                          {formatted}
                        </th>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 pr-4 text-[var(--text-primary)] ${
                          col.numeric ? "tabular-nums text-right" : ""
                        }`}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
