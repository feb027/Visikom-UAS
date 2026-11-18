import { useEffect, useState } from "react";
import { ComparisonTab } from "./components/comparison/ComparisonTab";
import { AppHeader } from "./components/layout/AppHeader";
import { NavigationTabs } from "./components/layout/NavigationTabs";
import { MethodologyTab } from "./components/methodology/MethodologyTab";
import { ScreeningTab } from "./components/screening/ScreeningTab";
import { useColorScheme } from "./hooks/useColorScheme";
import { useScreening } from "./hooks/useScreening";
import type { NavTabId } from "./types/mydria";

const TAB_TITLES: Record<NavTabId, string> = {
  screening: "Pemeriksaan Fundus | Mydria",
  comparison: "Komparasi Model | Mydria",
  methodology: "Metodologi & Batasan | Mydria",
};

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>("screening");
  const { activeScheme, toggleScheme } = useColorScheme();
  const screening = useScreening();

  useEffect(() => {
    document.title = TAB_TITLES[activeTab];
  }, [activeTab]);

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <a href="#main-content" className="visually-hidden skip-link">
        Lewati ke konten utama
      </a>

      <AppHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeScheme={activeScheme}
        onToggleTheme={toggleScheme}
        health={screening.health}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1120px] px-4 pt-3 pb-24 sm:px-6 sm:pt-8 sm:pb-14"
      >
        {activeTab === "screening" ? (
          <ScreeningTab
            examples={screening.examples}
            prediction={screening.prediction}
            selectedName={screening.selectedName}
            rejectedPreviewUrl={screening.rejectedPreviewUrl}
            activeLayer={screening.layer}
            onSelectLayer={screening.setLayer}
            isLoading={screening.isLoading}
            loadingStep={screening.loadingStep}
            networkError={screening.networkError}
            onSelectFile={screening.analyzeFile}
            onSelectExample={screening.analyzeExample}
            onReset={screening.resetScreening}
          />
        ) : null}

        {activeTab === "comparison" ? <ComparisonTab active={activeTab === "comparison"} /> : null}

        {activeTab === "methodology" ? <MethodologyTab /> : null}
      </main>

      <NavigationTabs activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}

export default App;
