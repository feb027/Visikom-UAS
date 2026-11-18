import type { HealthResponse, NavTabId } from "../../types/mydria";
import { handleRovingTabKeyDown } from "../../utils/tabKeyboard";
import { MydriaLogo } from "../common/MydriaLogo";
import { NAV_ITEMS } from "./NavigationTabs";

interface AppHeaderProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  activeScheme: "light" | "dark";
  onToggleTheme: () => void;
  health: HealthResponse | null;
}

export function AppHeader({
  activeTab,
  onSelectTab,
  activeScheme,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="mydria-topbar sticky top-0 z-40 border-b border-[var(--border-hairline)]">
      <div className="mx-auto flex h-11 max-w-[1120px] items-center justify-between gap-4 px-4 sm:h-12 sm:px-6">
        <span className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
          <MydriaLogo className="h-[22px] w-[22px] shrink-0" />
          <span>Mydria</span>
        </span>

        <nav aria-label="Utama" className="hidden sm:block">
          <div role="tablist" aria-label="Menu layar" className="flex items-center gap-6">
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
                  className={`relative min-h-12 cursor-pointer px-1 text-xs font-medium transition-colors ${
                    selected
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--accent-signal)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        <button
          type="button"
          role="switch"
          aria-checked={activeScheme === "dark"}
          aria-label="Alihkan mode ruang gelap"
          onClick={onToggleTheme}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-recessed)] p-0.5"
        >
          <span
            aria-hidden="true"
            className="braun-switch-thumb block h-4 w-4 rounded-full bg-[var(--text-primary)]"
          />
        </button>
      </div>
    </header>
  );
}
