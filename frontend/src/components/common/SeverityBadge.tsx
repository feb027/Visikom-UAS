interface SeverityBadgeProps {
  grade: number;
  label: string;
  referable: boolean;
}

const GRADE_STYLE: Record<number, { bg: string; fg: string }> = {
  0: { bg: "var(--grade-0-bg)", fg: "var(--grade-0-fg)" },
  1: { bg: "var(--grade-1-bg)", fg: "var(--grade-1-fg)" },
  2: { bg: "var(--grade-2-bg)", fg: "var(--grade-2-fg)" },
  3: { bg: "var(--grade-3-bg)", fg: "var(--grade-3-fg)" },
  4: { bg: "var(--grade-4-bg)", fg: "var(--grade-4-fg)" },
};

export function SeverityBadge({ grade, label, referable }: SeverityBadgeProps) {
  const palette = GRADE_STYLE[grade] ?? GRADE_STYLE[0];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="tabular-nums inline-flex items-center rounded-[12px] px-3 py-1.5 text-sm font-semibold"
        style={{ backgroundColor: palette.bg, color: palette.fg }}
      >
        Grade {grade}: {label}
      </span>
      <span
        className="inline-flex items-center rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
      >
        {referable ? "Referable DR (>= Grade 2)" : "Non-Referable"}
      </span>
    </div>
  );
}
