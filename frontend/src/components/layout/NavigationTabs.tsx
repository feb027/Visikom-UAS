import { BarChart3, BookOpen, ScanEye } from "lucide-react";
import type { NavTabId } from "../../types/mydria";
import { handleRovingTabKeyDown } from "../../utils/tabKeyboard";

export const NAV_ITEMS: Array<{ id: NavTabId; label: string; mobileLabel: string }> = [
  { id: "screening", label: "Pemeriksaan", mobileLabel: "Periksa" },
  { id: "comparison", label: "Komparasi Model", mobileLabel: "Komparasi" },
  { id: "methodology", label: "Metodologi & Batasan", mobileLabel: "Info" },
];

interface NavigationTabsProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export function NavigationTabs({ activeTab, onSelectTab }: NavigationTabsProps) {
  return (
    <nav
      aria-label="Layar ponsel"
      className="mydria-chrome-surface fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-hairline)] pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div role="tablist" aria-label="Menu utama ponsel" className="grid h-[60px] grid-cols-3">
        {NAV_ITEMS.map((item, idx) => {
          const active = activeTab === item.id;
          const Icon = item.id === "screening" ? ScanEye : item.id === "comparison" ? BarChart3 : BookOpen;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectTab(item.id)}
              onKeyDown={(e) => handleRovingTabKeyDown(e, NAV_ITEMS, idx, (next) => onSelectTab(next.id))}
              className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${
                active ? "text-[var(--accent-link)]" : "text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
