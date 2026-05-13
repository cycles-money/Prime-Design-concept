import { useState, useEffect, useMemo } from 'react';
import { Agentation } from 'agentation';
import { ClipboardList, RefreshCw, Users, Settings, CircleHelp, Sun, Moon, TrendingUp } from 'lucide-react';
import BatchesView from './components/BatchesView';
import CyclesView from './components/CyclesView';
import { AccountOverview } from './components/CyclesView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import CounterpartiesView from './components/CounterpartiesView';
import { DarkModeContext } from './context/DarkModeContext';
import { ApiClientProvider, useApiQuery } from './api/ApiClientContext';
import { batchToLegacy, cycleToLegacy } from './api/adapters';
import type { Batch, Cycle } from './types';

type Tab = 'batches' | 'cycles' | 'counterparties' | 'settings' | 'help' | 'overview';

const isDemoMode = (): boolean => {
  try { return new URLSearchParams(window.location.search).get('demo') === '1'; }
  catch { return false; }
};

// ── Nav icons ──────────────────────────────────────────────────────────────────

function BatchesIcon()       { return <ClipboardList aria-hidden="true" className="w-3.5 h-3.5" />; }
function CyclesIcon()        { return <RefreshCw     aria-hidden="true" className="w-3.5 h-3.5" />; }
function CounterpartiesIcon(){ return <Users         aria-hidden="true" className="w-3.5 h-3.5" />; }
function SettingsIcon()      { return <Settings      aria-hidden="true" className="w-4 h-4" />; }
function HelpIcon()          { return <CircleHelp    aria-hidden="true" className="w-4 h-4" />; }
function SunIcon()           { return <Sun           aria-hidden="true" className="w-4 h-4" />; }
function MoonIcon()          { return <Moon          aria-hidden="true" className="w-4 h-4" />; }

export default function App() {
  return (
    <ApiClientProvider>
      <AppInner />
    </ApiClientProvider>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState<Tab>('batches');

  // Fetch via the ApiClient. The heavy views still consume legacy prototype
  // types (`Batch`, `Cycle`) — we adapt at the App boundary. As individual
  // views are migrated to consume server types directly via useApiClient(),
  // these adapters can shrink and eventually be removed.
  const batchesQuery = useApiQuery((c) => c.listBatches({ limit: 1000 }), []);
  const cyclesQuery = useApiQuery((c) => c.listCycles({ limit: 1000 }), []);

  const batchesData = batchesQuery.data;
  const cyclesData = cyclesQuery.data;
  const batches: Batch[] = useMemo(
    () => (batchesData ? batchesData.data.map(batchToLegacy) : []),
    [batchesData],
  );
  const cycles: Cycle[] = useMemo(
    () => (cyclesData ? cyclesData.data.map(cycleToLegacy) : []),
    [cyclesData],
  );

  // Setters that the heavy views still expect. They mutate the local legacy
  // copy — full round-trip to the api client is a future migration step
  // per-view (call updateBatch/etc. inside the view, then refetch).
  const [batchesOverride, setBatchesOverride] = useState<Batch[] | null>(null);
  const [cyclesOverride, setCyclesOverride] = useState<Cycle[] | null>(null);
  const effectiveBatches = batchesOverride ?? batches;
  const effectiveCycles = cyclesOverride ?? cycles;
  // When fresh data arrives, drop the override so the api client is the
  // source of truth again.
  useEffect(() => {
    setBatchesOverride(null);
  }, [batchesData]);
  useEffect(() => {
    setCyclesOverride(null);
  }, [cyclesData]);

  const [initialBatchId, setInitialBatchId] = useState<string | undefined>(undefined);
  const [initialCpFilter, setInitialCpFilter] = useState<string | undefined>(undefined);
  const [batchesKey, setBatchesKey] = useState(0);
  const [cpKey, setCpKey] = useState(0);
  const isDemo = isDemoMode();

  // Reset a tab to its main page (clears any deep-link state and forces remount)
  const goToTab = (tab: Tab) => {
    if (tab === 'batches') {
      setInitialBatchId(undefined);
      setInitialCpFilter(undefined);
      setBatchesKey((k) => k + 1);
    } else if (tab === 'counterparties') {
      setCpKey((k) => k + 1);
    }
    setActiveTab(tab);
  };
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('cycles-prime-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('cycles-prime-dark', String(isDark));
  }, [isDark]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<Tab>).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

  // Navigate to the batches page, optionally drilling into a specific batch
  // and/or pre-applying a counterparty filter. Either field may be omitted —
  // e.g. the Counterparties list dispatches { cpName } only.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | { batchId?: string; cpName?: string }>).detail;
      const batchId = typeof detail === 'string' ? detail : detail?.batchId;
      const cpName = typeof detail === 'string' ? undefined : detail?.cpName;
      if (!batchId && !cpName) return;
      setInitialBatchId(batchId);
      setInitialCpFilter(cpName);
      setActiveTab('batches');
    };
    window.addEventListener('navigate-to-batch', handler);
    return () => window.removeEventListener('navigate-to-batch', handler);
  }, []);

  return (
    <DarkModeContext.Provider value={isDark}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:bg-white focus:text-[var(--color-800)] focus:rounded focus:shadow"
      >
        Skip to content
      </a>
      <div className="flex flex-col h-screen font-sans overflow-hidden bg-gray-50 dark:bg-[var(--color-1)] transition-colors duration-150">
        {/* ── Top navigation bar ──────────────────────────────────────────── */}
        <header className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-[var(--border)] relative flex items-center flex-shrink-0 h-12 transition-colors duration-150 px-3">

          {/* Brand */}
          <div className="flex items-center flex-shrink-0">
          <button
            onClick={() => goToTab('batches')}
            aria-label="Go to Batches"
            className="flex items-center gap-2"
          >
            {/* Icon mark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 27 15"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-3 w-auto text-gray-900 dark:text-gray-100 flex-shrink-0"
            >
              <path d="M13.1839 14.4579C16.8864 14.4579 19.8878 11.4344 19.8878 7.70476C19.8878 3.97513 16.8864 0.95166 13.1839 0.95166C9.48143 0.95166 6.47998 3.97513 6.47998 7.70476C6.47998 11.4344 9.48143 14.4579 13.1839 14.4579Z" />
              <path d="M18.2776 3.31611C22.334 2.46038 25.2885 2.47069 25.6331 3.50857C26.1346 5.01384 20.966 8.11373 14.088 10.4335C7.2101 12.7533 1.22945 13.4097 0.731344 11.901C0.386765 10.8631 2.74082 9.06226 6.49024 7.28893" />
            </svg>
            {/* Wordmark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 777 58"
              fill="currentColor"
              aria-label="Cycles Prime"
              role="img"
              className="h-3 w-auto text-gray-900 dark:text-gray-100 flex-shrink-0"
            >
              <path d="M1.96397e-05 28.4C1.96397e-05 24.9333 0.613353 21.5467 1.84002 18.24C3.12002 14.88 4.96002 11.84 7.36002 9.12001C9.76002 6.34668 12.6934 4.16001 16.16 2.56001C19.6267 0.906676 23.5734 0.0800085 28 0.0800085C33.2267 0.0800085 37.7334 1.22668 41.52 3.52001C45.36 5.81334 48.2134 8.80001 50.08 12.48L41.6 18.32C40.64 16.1867 39.3867 14.5067 37.84 13.28C36.2934 12 34.64 11.12 32.88 10.64C31.12 10.1067 29.3867 9.84001 27.68 9.84001C24.9067 9.84001 22.48 10.4 20.4 11.52C18.3734 12.64 16.6667 14.1067 15.28 15.92C13.8934 17.7333 12.8534 19.76 12.16 22C11.52 24.24 11.2 26.48 11.2 28.72C11.2 31.2267 11.6 33.6533 12.4 36C13.2 38.2933 14.32 40.3467 15.76 42.16C17.2534 43.92 19.0134 45.3333 21.04 46.4C23.12 47.4133 25.3867 47.92 27.84 47.92C29.6 47.92 31.3867 47.6267 33.2 47.04C35.0134 46.4533 36.6934 45.52 38.24 44.24C39.7867 42.96 40.9867 41.3067 41.84 39.28L50.88 44.48C49.76 47.3067 47.92 49.7067 45.36 51.68C42.8534 53.6533 40.0267 55.1467 36.88 56.16C33.7334 57.1733 30.6134 57.68 27.52 57.68C23.4667 57.68 19.76 56.8533 16.4 55.2C13.04 53.4933 10.1334 51.2533 7.68002 48.48C5.28002 45.6533 3.38669 42.5067 2.00002 39.04C0.666686 35.52 1.96397e-05 31.9733 1.96397e-05 28.4ZM83.1994 0.400009L97.1994 27.12L111.439 0.400009H123.359L102.719 37.36V57.2H91.7594V37.2L71.1994 0.400009H83.1994ZM142.5 28.4C142.5 24.9333 143.113 21.5467 144.34 18.24C145.62 14.88 147.46 11.84 149.86 9.12001C152.26 6.34668 155.193 4.16001 158.66 2.56001C162.127 0.906676 166.073 0.0800085 170.5 0.0800085C175.727 0.0800085 180.233 1.22668 184.02 3.52001C187.86 5.81334 190.713 8.80001 192.58 12.48L184.1 18.32C183.14 16.1867 181.887 14.5067 180.34 13.28C178.793 12 177.14 11.12 175.38 10.64C173.62 10.1067 171.887 9.84001 170.18 9.84001C167.407 9.84001 164.98 10.4 162.9 11.52C160.873 12.64 159.167 14.1067 157.78 15.92C156.393 17.7333 155.353 19.76 154.66 22C154.02 24.24 153.7 26.48 153.7 28.72C153.7 31.2267 154.1 33.6533 154.9 36C155.7 38.2933 156.82 40.3467 158.26 42.16C159.753 43.92 161.513 45.3333 163.54 46.4C165.62 47.4133 167.887 47.92 170.34 47.92C172.1 47.92 173.887 47.6267 175.7 47.04C177.513 46.4533 179.193 45.52 180.74 44.24C182.287 42.96 183.487 41.3067 184.34 39.28L193.38 44.48C192.26 47.3067 190.42 49.7067 187.86 51.68C185.353 53.6533 182.527 55.1467 179.38 56.16C176.233 57.1733 173.113 57.68 170.02 57.68C165.967 57.68 162.26 56.8533 158.9 55.2C155.54 53.4933 152.633 51.2533 150.18 48.48C147.78 45.6533 145.887 42.5067 144.5 39.04C143.167 35.52 142.5 31.9733 142.5 28.4ZM220.784 57.2V0.400009H231.824V47.52H260.784V57.2H220.784ZM326.943 47.52V57.2H287.503V0.400009H326.223V10.08H298.543V23.76H322.463V32.72H298.543V47.52H326.943ZM389.389 15.28C389.016 14.9067 388.323 14.4 387.309 13.76C386.349 13.12 385.149 12.5067 383.709 11.92C382.323 11.3333 380.803 10.8267 379.149 10.4C377.496 9.92001 375.816 9.68001 374.109 9.68001C371.123 9.68001 368.856 10.24 367.309 11.36C365.816 12.48 365.069 14.0533 365.069 16.08C365.069 17.6267 365.549 18.8533 366.509 19.76C367.469 20.6667 368.909 21.44 370.829 22.08C372.749 22.72 375.149 23.4133 378.029 24.16C381.763 25.0667 384.989 26.1867 387.709 27.52C390.483 28.8 392.589 30.5067 394.029 32.64C395.523 34.72 396.269 37.4933 396.269 40.96C396.269 44 395.709 46.6133 394.589 48.8C393.469 50.9333 391.923 52.6667 389.949 54C387.976 55.3333 385.736 56.32 383.229 56.96C380.723 57.5467 378.056 57.84 375.229 57.84C372.403 57.84 369.576 57.5467 366.749 56.96C363.923 56.3733 361.203 55.5467 358.589 54.48C355.976 53.36 353.576 52.0267 351.389 50.48L356.269 40.96C356.749 41.44 357.603 42.08 358.829 42.88C360.056 43.6267 361.549 44.4 363.309 45.2C365.069 45.9467 366.989 46.5867 369.069 47.12C371.149 47.6533 373.256 47.92 375.389 47.92C378.376 47.92 380.643 47.4133 382.189 46.4C383.736 45.3867 384.509 43.9467 384.509 42.08C384.509 40.3733 383.896 39.04 382.669 38.08C381.443 37.12 379.736 36.2933 377.549 35.6C375.363 34.8533 372.776 34.0533 369.789 33.2C366.216 32.1867 363.229 31.0667 360.829 29.84C358.429 28.56 356.643 26.96 355.469 25.04C354.296 23.12 353.709 20.72 353.709 17.84C353.709 13.9467 354.616 10.6933 356.429 8.08001C358.296 5.41334 360.803 3.41334 363.949 2.08001C367.096 0.693343 370.589 9.53674e-06 374.429 9.53674e-06C377.096 9.53674e-06 379.603 0.293342 381.949 0.880008C384.349 1.46668 386.589 2.24001 388.669 3.20001C390.749 4.16001 392.616 5.20001 394.269 6.32001L389.389 15.28ZM466.203 57.2V0.400009H489.723C492.176 0.400009 494.416 0.906676 496.443 1.92001C498.523 2.93334 500.309 4.32001 501.803 6.08001C503.296 7.78667 504.469 9.70668 505.323 11.84C506.176 13.92 506.603 16.0533 506.603 18.24C506.603 21.3333 505.909 24.2667 504.523 27.04C503.189 29.76 501.296 31.9733 498.843 33.68C496.389 35.3867 493.509 36.24 490.203 36.24H471.803V57.2H466.203ZM471.803 31.28H489.963C492.203 31.28 494.149 30.6667 495.803 29.44C497.456 28.2133 498.736 26.6133 499.643 24.64C500.549 22.6667 501.003 20.5333 501.003 18.24C501.003 15.8933 500.469 13.7333 499.403 11.76C498.336 9.78668 496.923 8.24001 495.163 7.12001C493.456 5.94668 491.563 5.36001 489.483 5.36001H471.803V31.28ZM535.968 57.2V0.400009H559.968C562.421 0.400009 564.661 0.906676 566.688 1.92001C568.715 2.93334 570.475 4.32001 571.968 6.08001C573.515 7.78667 574.688 9.70668 575.488 11.84C576.341 13.92 576.768 16.0533 576.768 18.24C576.768 20.96 576.235 23.52 575.168 25.92C574.155 28.32 572.688 30.3467 570.768 32C568.901 33.6533 566.688 34.7467 564.128 35.28L578.048 57.2H571.728L558.368 36.24H541.568V57.2H535.968ZM541.568 31.28H560.128C562.368 31.28 564.315 30.6667 565.968 29.44C567.621 28.2133 568.901 26.6133 569.808 24.64C570.715 22.6133 571.168 20.48 571.168 18.24C571.168 15.9467 570.635 13.84 569.568 11.92C568.555 9.94668 567.168 8.37334 565.408 7.20001C563.701 5.97335 561.781 5.36001 559.648 5.36001H541.568V31.28ZM608.234 57.2V0.400009H613.834V57.2H608.234ZM698.398 57.2V10.96L677.838 46.88H674.318L653.678 10.96V57.2H648.078V0.400009H653.838L675.998 39.28L698.318 0.400009H703.998V57.2H698.398ZM776.394 52.24V57.2H738.234V0.400009H775.674V5.36001H743.834V25.84H771.594V30.56H743.834V52.24H776.394Z" />
            </svg>
          </button>
          </div>

          {/* Primary tab navigation — centered absolutely */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center h-full gap-0.5">
            {(['batches', 'cycles', 'counterparties'] as Tab[]).map((tab) => {
              const Icon = tab === 'batches' ? BatchesIcon : tab === 'cycles' ? CyclesIcon : CounterpartiesIcon;
              const label = tab === 'counterparties' ? 'Counterparties' : tab.charAt(0).toUpperCase() + tab.slice(1);
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => goToTab(tab)}
                  className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]
                    ${isActive
                      ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-gray-900 dark:text-gray-100'
                      : 'hover-item text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right side: utility icons */}
          <div className="ml-auto flex items-center gap-1">

            {/* Settings */}
            <button
              onClick={() => setActiveTab('settings')}
              aria-label="Settings"
              title="Settings"
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]
                ${activeTab === 'settings'
                  ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-gray-900 dark:text-gray-100'
                  : 'hover-item text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <SettingsIcon />
            </button>

            {/* Help */}
            <button
              onClick={() => setActiveTab('help')}
              aria-label="Help"
              title="Help"
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]
                ${activeTab === 'help'
                  ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-gray-900 dark:text-gray-100'
                  : 'hover-item text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <HelpIcon />
            </button>


            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="hover-item w-8 h-8 flex items-center justify-center rounded-full
                text-gray-500 dark:text-gray-300
                hover:text-gray-700 dark:hover:text-gray-300
                transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)]"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 overflow-hidden">
          {activeTab === 'batches'        ? <BatchesView key={batchesKey} batches={effectiveBatches} onBatchesChange={setBatchesOverride} initialBatchId={initialBatchId} initialCpFilter={initialCpFilter} isDemo={isDemo} />
          : activeTab === 'cycles'         ? <CyclesView batches={effectiveBatches} cycles={effectiveCycles} onCyclesChange={setCyclesOverride} isDemo={isDemo} />
          : activeTab === 'counterparties' ? <CounterpartiesView key={cpKey} batches={effectiveBatches} />
          : activeTab === 'settings'       ? <SettingsView />
          : activeTab === 'overview'       ? (
              <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
                <div className="flex-shrink-0 px-5 py-4 border-b border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('settings')}
                    aria-label="Back to Settings"
                    className="hover-item flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                    Settings
                  </button>
                  <span className="text-gray-200 dark:text-gray-700 select-none">/</span>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-300)]" strokeWidth={2} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cycles Overview</span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AccountOverview
                    cycles={effectiveCycles}
                    batches={effectiveBatches}
                    onSelectCycle={() => setActiveTab('cycles')}
                  />
                </div>
              </div>
            )
          : <HelpView />}
        </main>
      </div>
      {import.meta.env.DEV && <Agentation />}
    </DarkModeContext.Provider>
  );
}
