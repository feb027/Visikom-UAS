import { BarChart3, Info, ScanEye } from "lucide-react";
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

/**
 * Opsi Dock C (Frosted Segmented Island): kapsul batu mengambang
 * dengan pil aktif terangkat bersih tanpa dot merah.
 */
export function NavigationTabs({ activeTab, onSelectTab }: NavigationTabsProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 sm:hidden"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <nav aria-label="Layar ponsel" className="pointer-events-auto">
        <div
          role="tablist"
          aria-label="Menu utama ponsel"
          className="mydria-capsule-dock inline-grid grid-cols-3 items-center gap-1 rounded-full p-1"
        >
          {NAV_ITEMS.map((item, idx) => {
            const active = activeTab === item.id;
            const Icon = item.id === "screening" ? ScanEye : item.id === "comparison" ? BarChart3 : Info;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(item.id)}
                onKeyDown={(e) => handleRovingTabKeyDown(e, NAV_ITEMS, idx, (next) => onSelectTab(next.id))}
                className={`inline-flex min-h-11 min-w-[92px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1 text-[11px] transition-colors ${
                  active
                    ? "bg-[var(--dock-active-bg)] font-semibold text-[var(--text-primary)] shadow-sm"
                    : "font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
