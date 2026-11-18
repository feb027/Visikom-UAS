import type { NavTabId } from "../../types/mydria";
import { handleRovingTabKeyDown } from "../../utils/tabKeyboard";

export const NAV_ITEMS: Array<{ id: NavTabId; label: string; mobileLabel: string }> = [
  { id: "screening", label: "Periksa", mobileLabel: "Periksa" },
  { id: "comparison", label: "Komparasi", mobileLabel: "Komparasi" },
  { id: "methodology", label: "Info", mobileLabel: "Info" },
];

interface NavigationTabsProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export function NavigationTabs({ activeTab, onSelectTab }: NavigationTabsProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 sm:hidden"
      style={{ bottom: "calc(14px + env(safe-area-inset-bottom))" }}
    >
      <nav aria-label="Layar ponsel" className="pointer-events-auto">
        <div
          role="tablist"
          aria-label="Menu utama ponsel"
          className="mydria-capsule-dock inline-flex items-center gap-1 rounded-full px-2 py-1"
        >
          {NAV_ITEMS.map((item, idx) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(item.id)}
                onKeyDown={(e) => handleRovingTabKeyDown(e, NAV_ITEMS, idx, (next) => onSelectTab(next.id))}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors ${
                  active
                    ? "bg-[var(--bg-recessed)] font-semibold text-[var(--text-primary)]"
                    : "font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{item.mobileLabel}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[var(--accent-signal)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
