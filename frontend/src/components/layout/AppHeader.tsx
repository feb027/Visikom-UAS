import { Moon, Sun } from "lucide-react";
import type { HealthResponse, NavTabId } from "../../types/mydria";
import { handleRovingTabKeyDown } from "../../utils/tabKeyboard";
import { NAV_ITEMS } from "./NavigationTabs";

interface AppHeaderProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onToggleTheme: () => void;
  health: HealthResponse | null;
}

export function AppHeader({ activeTab, onSelectTab, onToggleTheme, health }: AppHeaderProps) {
  const stageBadge =
    health?.model_stage === "full"
      ? "Model Terlatih"
      : health?.model_stage === "smoke"
        ? "Bobot Uji Smoke"
        : "Memuat Model";

  return (
    <header className="mydria-chrome-surface sticky top-0 z-40 border-b border-[var(--border-hairline)]">
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
            Mydria
          </span>
          <span className="tabular-nums rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
            {stageBadge}
          </span>
        </div>

        <nav aria-label="Utama" className="hidden sm:block">
          <div role="tablist" aria-label="Menu layar" className="segmented-rail inline-flex items-center gap-1">
            {NAV_ITEMS.map((item, idx) => {
              const selected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelectTab(item.id)}
                  onKeyDown={(e) => handleRovingTabKeyDown(e, NAV_ITEMS, idx, (next) => onSelectTab(next.id))}
                  className={`min-h-8 cursor-pointer rounded-[6px] px-3 py-1 text-xs font-semibold transition-colors ${
                    selected
                      ? "segmented-pill-active"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
        >
          <span className="theme-label-to-dark">
            <Moon className="h-4 w-4" aria-hidden="true" />
            <span>Gelap</span>
          </span>
          <span className="theme-label-to-light">
            <Sun className="h-4 w-4" aria-hidden="true" />
            <span>Terang</span>
          </span>
        </button>
      </div>
    </header>
  );
}
