// ── HelpView — Status reference and platform overview ────────────────────────
import { FileText, RefreshCw, ClipboardList, BookOpen, Users, ChevronRight } from 'lucide-react';

// ── Shared primitives ─────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: 'gray' | 'amber' | 'blue' | 'positive' }) {
  const cls: Record<string, string> = {
    gray:    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 border border-transparent',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    blue:    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-[var(--color-800)] dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
    positive: 'bg-[var(--color-50)] text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-200)]',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-2xs font-semibold leading-tight ${cls[color]}`}>
      {label}
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)]">
        <span className="text-gray-500 dark:text-gray-300">{icon}</span>
        <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusRow({
  badge,
  title,
  description,
  note,
}: {
  badge: React.ReactNode;
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-gray-100 dark:border-[var(--border)] last:border-0">
      <div className="w-36 flex-shrink-0 pt-0.5">{badge}</div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-0.5">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed">{description}</p>
        {note && (
          <p className="text-2xs text-gray-500 dark:text-gray-300 mt-1 italic">{note}</p>
        )}
      </div>
    </div>
  );
}

function FlowStep({ step, label, sub, last = false }: { step: number; label: string; sub: string; last?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <span className="text-2xs font-bold text-white">{step}</span>
        </div>
        {!last && <div className="w-px flex-1 bg-gray-200 dark:bg-[var(--surface-3)] mt-1 mb-0 min-h-[28px]" />}
      </div>
      <div className="pb-5">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

function ConceptRow({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-[var(--border)] last:border-0">
      <dt className="w-32 flex-shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300 pt-0.5">{term}</dt>
      <dd className="flex-1 text-xs text-gray-500 dark:text-gray-300 leading-relaxed">{definition}</dd>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const IconBatch    = <ClipboardList aria-hidden="true" className="w-4 h-4" strokeWidth={2} />;
const IconCycle    = <RefreshCw     aria-hidden="true" className="w-4 h-4" strokeWidth={2} />;
const IconFlow     = <FileText      aria-hidden="true" className="w-4 h-4" strokeWidth={2} />;
const IconGlossary = <BookOpen      aria-hidden="true" className="w-4 h-4" strokeWidth={2} />;
const IconLynq     = <Users         aria-hidden="true" className="w-4 h-4" strokeWidth={2} />;

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HelpView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-[var(--color-1)]">
      <div className="w-full max-w-3xl mx-auto px-6 py-6 space-y-5">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Help & Reference</h1>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">
            Status definitions, settlement workflow, and key concepts for Cycles Prime.
          </p>
        </div>

        {/* ── Batch statuses ───────────────────────────────────────────── */}
        <Section title="Batch Statuses" icon={IconBatch}>
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-4 leading-relaxed">
            A <strong className="text-gray-700 dark:text-gray-300">batch</strong> represents your netted position against a single counterparty at a given cut-off time.
            It moves through four statuses from creation to settlement inclusion.
          </p>
          <dl>
            <StatusRow
              badge={<Badge label="Draft" color="gray" />}
              title="Draft"
              description="The batch has been created but not yet submitted. Obligations are still being entered or reviewed. The counterparty cannot see it yet."
              note="You can freely edit obligation amounts while a batch is in Draft."
            />
            <StatusRow
              badge={<Badge label="Pending" color="amber" />}
              title="Pending"
              description="The batch has been submitted and sent to the counterparty for review. Amounts are proposed but not yet mutually confirmed."
              note="Edits are locked until the counterparty responds or the batch is recalled."
            />
            <StatusRow
              badge={<Badge label="Approved" color="blue" />}
              title="Approved"
              description="Both sides have agreed on the obligation amounts. The netting figures are confirmed and locked. The batch is ready to enter the next netting cycle."
              note="No further changes can be made to a batch once approved."
            />
            <StatusRow
              badge={<Badge label="Cleared" color="positive" />}
              title="Cleared"
              description="The batch has been picked up by a netting cycle and cleared. Cleared and remaining amounts are updated after the cycle executes."
            />
          </dl>

          {/* Flow arrow */}
          <div className="mt-4 flex items-center gap-1.5 flex-wrap">
            {(['Draft', 'Pending', 'Approved', 'Cleared'] as const).map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1.5">
                <Badge
                  label={s}
                  color={(['gray', 'amber', 'blue', 'positive'] as const)[i]}
                />
                {i < arr.length - 1 && (
                  <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-500 dark:text-gray-600 flex-shrink-0" strokeWidth={2.5} />
                )}
              </span>
            ))}
          </div>
        </Section>

        {/* ── Cycle statuses ───────────────────────────────────────────── */}
        <Section title="Cycle Statuses" icon={IconCycle}>
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-4 leading-relaxed">
            A <strong className="text-gray-700 dark:text-gray-300">cycle</strong> is a daily multilateral netting run.
            All approved batches whose cut-off falls before the cycle time are included and netted against one another.
          </p>
          <dl>
            <StatusRow
              badge={<Badge label="Scheduled" color="amber" />}
              title="Scheduled"
              description="The cycle is upcoming and has not yet run. The cut-off time has not been reached. Batches marked 'Approved' before the cycle's cut-off will be included automatically."
              note="The next scheduled cycle is always shown at the top of the Cycles view with a live countdown."
            />
            <StatusRow
              badge={<Badge label="Completed" color="positive" />}
              title="Completed"
              description="The cycle has run. Clearing results are finalised — each obligation now has a confirmed Cleared amount and a Remaining balance. Any remaining balance must be settled externally or via Lynq."
            />
          </dl>

          <div className="mt-4 flex items-center gap-1.5">
            <Badge label="Scheduled" color="amber" />
            <ChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-600" strokeWidth={2.5} />
            <Badge label="Completed" color="positive" />
          </div>
        </Section>

        {/* ── End-to-end workflow ──────────────────────────────────────── */}
        <Section title="End-to-End Workflow" icon={IconFlow}>
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-5 leading-relaxed">
            How a trade obligation moves from creation through to final settlement.
          </p>
          <div>
            <FlowStep
              step={1}
              label="Create a batch"
              sub="A new batch is opened against a counterparty and obligations (deliver / receive) are entered. Status: Draft."
            />
            <FlowStep
              step={2}
              label="Submit for approval"
              sub="The batch is submitted to the counterparty. Both sides review and agree on the netted amounts. Status: Pending → Approved."
            />
            <FlowStep
              step={3}
              label="Netting cycle runs"
              sub="At the scheduled cut-off time, all Approved batches are picked up. Multilateral netting is applied across all counterparties. Status: Cleared."
            />
            <FlowStep
              step={4}
              label="Cycle completes"
              sub="The cycle executes and clearing results are posted. Each obligation shows a Cleared amount and a Remaining balance. Cycle status: Completed."
            />
            <FlowStep
              step={5}
              label="Settle remaining balance"
              sub="Any remaining USD-denominated balance can be settled directly via Lynq without leaving the platform. Non-USD or non-Lynq balances must be settled externally."
              last
            />
          </div>
        </Section>

        {/* ── Lynq integration ─────────────────────────────────────────── */}
        <Section title="Settle with Lynq" icon={IconLynq}>
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-4 leading-relaxed">
            The <strong className="text-gray-700 dark:text-gray-300">Settle with Lynq</strong> button appears on obligations that meet all of the following criteria:
          </p>
          <ul className="space-y-2 mb-4">
            {[
              { icon: '💱', text: 'USD-denominated asset — USDC, USDT, BUSD, DAI, or USD.' },
              { icon: '✅', text: 'Cycle has completed — clearing results are finalised.' },
              { icon: '📊', text: 'Remaining balance is greater than zero.' },
              { icon: '📋', text: 'Counterparty has a Lynq address configured in Settings.' },
              { icon: '🔑', text: 'Lynq API credentials are saved in Settings.' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                <span className="text-sm leading-4 flex-shrink-0">{icon}</span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
          <div className="bg-[var(--color-50)] dark:bg-[var(--color-950)]/10 border border-[var(--color-200)] dark:border-[var(--color-900)] rounded p-3">
            <p className="text-2xs text-[var(--color-800)] dark:text-[var(--color-300)] leading-relaxed">
              Settlements use the Lynq{' '}
              <code className="bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 px-1 rounded">/v1/send/request</code>{' '}
              API. Configure your API key and counterparty addresses in the{' '}
              <strong>⚙ Settings</strong> tab before attempting to settle.
            </p>
          </div>
        </Section>

        {/* ── Glossary ─────────────────────────────────────────────────── */}
        <Section title="Glossary" icon={IconGlossary}>
          <dl>
            <ConceptRow term="Batch"            definition="A bilateral netted position between Cycles Prime and one counterparty, covering all obligations due at a specific cut-off time." />
            <ConceptRow term="Cycle"            definition="A scheduled daily multilateral netting run. All Approved batches before the cut-off are included and netted simultaneously across all counterparties." />
            <ConceptRow term="Obligation"       definition="A single deliver or receive amount for a specific asset within a batch." />
            <ConceptRow term="Netting"          definition="The process of offsetting deliver and receive obligations across counterparties to arrive at a single net amount owed per asset." />
            <ConceptRow term="Cleared"          definition="The portion of an obligation that was settled through the netting cycle. Shown in green." />
            <ConceptRow term="Remaining"        definition="The portion of an obligation not settled by the cycle. Must be handled via Lynq or externally." />
            <ConceptRow term="% Cleared"        definition="Cleared ÷ Total × 100. Indicates how much of an obligation or cycle was resolved by netting." />
            <ConceptRow term="Cut-off time"     definition="The deadline by which a batch must reach Approved status to be included in the next netting cycle." />
            <ConceptRow term="Counterparty"     definition="The other entity in a bilateral obligation — e.g. FalconX, Cumberland DRW, Wintermute." />
            <ConceptRow term="Approval"    definition="The mutual confirmation process where both sides agree on the obligation amounts before a batch enters a cycle." />
            <ConceptRow term="Lynq"             definition="A real-time institutional payment network used to settle remaining USD balances directly from Cycles Prime." />
          </dl>
        </Section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-2xs text-gray-500 dark:text-gray-600">
            Cycles Prime · Prototype documentation · March 2026
          </p>
        </div>

      </div>
    </div>
  );
}
