import { useState } from 'react';
import { EyeOff, Eye, Users, ChevronRight, TrendingUp } from 'lucide-react';

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)]">
        <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Input row ─────────────────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
  rightSlot,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  description?: string;
  rightSlot?: React.ReactNode;
  autoComplete?: string;
}) {
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-start gap-6">
      <div className="w-52 flex-shrink-0 pt-2">
        <label htmlFor={inputId} className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {description && (
          <p className="text-2xs text-gray-500 dark:text-gray-300 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-1 flex gap-2">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 text-xs px-3 py-2 border border-gray-300 dark:border-[var(--border)] rounded
            bg-white dark:bg-[var(--surface-3)]
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.35)] focus-visible:border-[oklch(0.683_0.106_127.892)]
            transition-colors"
        />
        {rightSlot}
      </div>
    </div>
  );
}

// ── Main SettingsView ─────────────────────────────────────────────────────────

export default function SettingsView() {
  const [apiKey, setApiKey] = useState('sk-lynq-prototype-••••••••••••••••');
  const [showApiKey, setShowApiKey] = useState(false);
  const [accountName, setAccountName] = useState('TEST - Cycles');
  const [apiKeySaved, setApiKeySaved] = useState(true);
  const [accountNameSaved, setAccountNameSaved] = useState(true);

  const isConfigured = apiKey.trim().length > 0 && accountName.trim().length > 0;

  const handleSaveApiKey = () => { setApiKeySaved(true); };
  const handleSaveAccountName = () => { setAccountNameSaved(true); };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-[var(--color-1)]">
      <div className="w-full max-w-3xl mx-auto px-8 py-8 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
            Configure API integrations and platform credentials.
          </p>
        </div>

        {/* ── Lynq API Integration ─────────────────────────────────────── */}
        <Section title="Lynq API Integration">

          {/* Connection status */}
          <div className="flex items-center gap-2 mb-6 pb-5 border-b border-gray-100 dark:border-[var(--border)]">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Status:</span>
            {isConfigured ? (
              <span className="flex items-center gap-1.5 text-2xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] bg-[var(--color-50)] border border-[var(--color-200)] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-500)] dark:bg-[var(--color-300)] inline-block" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-2xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" />
                Not configured
              </span>
            )}
          </div>

          <div className="space-y-5">

            {/* Account name */}
            <LabeledInput
              label="Account Name"
              description="Your Lynq account display name."
              value={accountName}
              onChange={(v) => { setAccountName(v); setAccountNameSaved(false); }}
              placeholder="e.g. TEST - Cycles"
              autoComplete="off"
              rightSlot={
                <button
                  onClick={handleSaveAccountName}
                  disabled={accountNameSaved}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-2 rounded-full border transition-colors
                    ${accountNameSaved
                      ? 'text-gray-500 dark:text-gray-300 border-gray-200 dark:border-[var(--border)] cursor-default'
                      : 'text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] border-[#CDF698]'
                    }`}
                >
                  {accountNameSaved ? 'Saved' : 'Save'}
                </button>
              }
            />

            {/* API Key */}
            <LabeledInput
              label="API Key"
              description="Your Lynq API secret key. Keep this private."
              value={apiKey}
              onChange={(v) => { setApiKey(v); setApiKeySaved(false); }}
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-lynq-…"
              autoComplete="new-password"
              rightSlot={
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setShowApiKey((s) => !s)}
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    className="hover-item text-xs font-medium px-2.5 py-2 rounded-full border border-gray-300 dark:border-[var(--border)] text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? (
                      <EyeOff aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
                    ) : (
                      <Eye aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={apiKeySaved}
                    className={`text-xs font-medium px-3 py-2 rounded-full border transition-colors
                      ${apiKeySaved
                        ? 'text-gray-500 dark:text-gray-300 border-gray-200 dark:border-[var(--border)] cursor-default'
                        : 'text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] border-[#CDF698]'
                      }`}
                  >
                    {apiKeySaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              }
            />

            {/* API endpoint note */}
            <div className="bg-[var(--color-50)] dark:bg-[var(--color-950)]/10 border border-[var(--color-200)] dark:border-[var(--color-900)] rounded-lg p-4">
              <p className="text-2xs text-[var(--color-800)] dark:text-[var(--color-300)] leading-relaxed">
                Settlements use the Lynq{' '}
                <code className="font-mono bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 px-1 rounded">/v1/send/request</code>{' '}
                endpoint. Ensure your API key has <strong>send</strong> permissions enabled in your Lynq dashboard.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Cycles Overview pointer ──────────────────────────────────── */}
        <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp aria-hidden="true" className="w-4 h-4 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Cycles Overview</p>
              <p className="text-2xs text-gray-500 dark:text-gray-300 mt-1">
                Netting performance, clearing volume, and counterparty heatmap across all cycles.
              </p>
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'overview' })); }}
            className="flex-shrink-0 flex items-center gap-1 text-2xs font-medium text-[var(--color-800)] dark:text-[var(--color-300)] hover:underline"
          >
            Open Overview
            <ChevronRight aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
          </a>
        </div>

        {/* ── Counterparties pointer ───────────────────────────────────── */}
        <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center flex-shrink-0">
              <Users aria-hidden="true" className="w-4 h-4 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Counterparty management</p>
              <p className="text-2xs text-gray-500 dark:text-gray-300 mt-1">
                Add counterparties and configure their Lynq addresses in the Counterparties tab.
              </p>
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'counterparties' })); }}
            className="flex-shrink-0 flex items-center gap-1 text-2xs font-medium text-[var(--color-800)] dark:text-[var(--color-300)] hover:underline"
          >
            Go to Counterparties
            <ChevronRight aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
          </a>
        </div>

        {/* ── Prototype note ───────────────────────────────────────────── */}
        <div className="text-center pb-6">
          <p className="text-2xs text-gray-500 dark:text-gray-600">
            Prototype — settings are stored in memory only and reset on page reload.
          </p>
        </div>

      </div>
    </div>
  );
}
