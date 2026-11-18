interface TactileSeverityRulerProps {
  grade: number | null;
}

const TICKS = Array.from({ length: 41 }, (_, i) => i);

/**
 * Penggaris skala keparahan 0..4 ala instrumen Braun Dieter Rams.
 */
export function TactileSeverityRuler({ grade }: TactileSeverityRulerProps) {
  const activeGrade = grade !== null ? Math.min(4, Math.max(0, grade)) : null;
  const notchPercent = activeGrade !== null ? (activeGrade / 4) * 100 : null;

  return (
    <div className="pt-2">
      <div className="relative h-9 select-none">
        {notchPercent !== null ? (
          <div
            aria-hidden="true"
            className="mydria-smooth-pos absolute top-0 -translate-x-1/2"
            style={{ left: `${notchPercent}%` }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" className="block text-[var(--accent-signal)]">
              <polygon points="0,0 10,0 5,8" fill="currentColor" />
            </svg>
          </div>
        ) : null}

        <div className="absolute inset-x-0 top-2.5 flex items-start justify-between">
          {TICKS.map((idx) => {
            const isMajor = idx % 10 === 0;
            const isHalf = idx % 5 === 0 && !isMajor;
            return (
              <span
                key={idx}
                aria-hidden="true"
                className="block w-px bg-[var(--text-secondary)]"
                style={{
                  height: isMajor ? "16px" : isHalf ? "11px" : "7px",
                  opacity: isMajor ? 0.9 : 0.45,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="tabular-nums flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
        {[0, 1, 2, 3, 4].map((val) => {
          const isActive = activeGrade === val;
          return (
            <span
              key={val}
              className={isActive ? "font-bold text-[var(--accent-signal)]" : undefined}
            >
              {val}
            </span>
          );
        })}
      </div>
    </div>
  );
}
