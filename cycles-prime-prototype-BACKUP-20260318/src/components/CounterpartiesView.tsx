import { useState, useRef, useEffect } from 'react';
import NumberFlow from '@number-flow/react';
import { User, X, Pencil, Plus, Search, Users, UserMinus, UserCheck, Info, Trash2 } from 'lucide-react';
import { CounterpartyAvatar } from './CounterpartyAvatar';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Counterparty {
  id: string;
  name: string;
  lynqName: string;
  accountId: string;
  active: boolean;
}

// ── Seed data ──────────────────────────────────────────────────────────────────

const SEED: Counterparty[] = [
  { id: '1', name: 'FalconX',        lynqName: 'TEST - FalconX',   accountId: '0xf31c8b4e1a762d99c5abc21083abc001', active: true },
  { id: '2', name: 'Cumberland DRW', lynqName: 'TEST - Cumberland', accountId: '0xc82b9f1e0c4d3a87b5cde21094def002', active: true },
  { id: '3', name: 'B2C2',           lynqName: 'TEST - B2C2',       accountId: '0xb2c2d8a1153d09277319035b0013ae03',  active: true },
  { id: '4', name: 'Wintermute',     lynqName: 'TEST - Wintermute', accountId: '0xw1nt3r4d8b116ec9277731d9035b0004', active: true },
  { id: '5', name: 'Galaxy Digital', lynqName: 'TEST - Galaxy',     accountId: '0xa985d8101de1153d0927731d9035b0005', active: true },
  { id: '6', name: 'Jump Trading',   lynqName: 'TEST - Jump',       accountId: '0x1ump7rad1n60d8101de115d09277310006', active: false },
];

const EMPTY_FORM = { name: '', lynqName: '', accountId: '' };

// ── Add / Edit modal ───────────────────────────────────────────────────────────

type FormState = { name: string; lynqName: string; accountId: string };

function Field({
  label, field, placeholder, mono = false, required = false, form, nameRef, setForm,
}: {
  label: string;
  field: keyof FormState;
  placeholder: string;
  mono?: boolean;
  required?: boolean;
  form: FormState;
  nameRef: React.RefObject<HTMLInputElement>;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const fieldId = `cp-field-${field}`;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-negative-400 ml-0.5">*</span>}
      </label>
      <input
        id={fieldId}
        ref={field === 'name' ? nameRef : undefined}
        type="text"
        value={form[field]}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        name={field}
        autoComplete="off"
        className={`w-full text-xs px-3 py-2 border border-gray-300 dark:border-[var(--border)] rounded
          bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] focus-visible:border-[oklch(0.683_0.106_127.892)]
          transition-colors ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

interface ModalProps {
  initial?: Counterparty;
  onSave: (data: FormState) => void;
  onClose: () => void;
}

function CpModal({ initial, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState<FormState>({
    name:      initial?.name      ?? '',
    lynqName:  initial?.lynqName  ?? '',
    accountId: initial?.accountId ?? '',
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initial;

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  const valid = form.name.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[var(--color-1)] rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            {form.name.trim() ? (
              <CounterpartyAvatar name={form.name.trim()} size={28} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] flex items-center justify-center flex-shrink-0">
                <User aria-hidden="true" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              </div>
            )}
            <span id="cp-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isEdit ? 'Edit counterparty' : 'Add counterparty'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-0.5"
            aria-label="Close"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 overscroll-contain">
          <Field label="Name"              field="name"      placeholder="e.g. FalconX"        required form={form} nameRef={nameRef} setForm={setForm} />
          <Field label="Lynq Account Name" field="lynqName"  placeholder="e.g. TEST - FalconX"         form={form} nameRef={nameRef} setForm={setForm} />
          <Field label="Lynq Account ID"   field="accountId" placeholder="0x…"                    mono  form={form} nameRef={nameRef} setForm={setForm} />
          {!form.lynqName && !form.accountId && (
            <p className="text-2xs text-gray-500 dark:text-gray-300 italic">
              Lynq fields are optional. They're needed to enable "Settle with Lynq" for this counterparty.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[var(--surface-3)] border-t border-gray-200 dark:border-[var(--border)] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors
              ${valid
                ? 'text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]'
                : 'text-gray-500 bg-gray-100 dark:bg-[var(--surface-3)] cursor-not-allowed'
              }`}
          >
            {isEdit ? 'Save changes' : 'Add counterparty'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { confirmRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[var(--color-1)] rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-negative-100 dark:bg-negative-900/40 flex items-center justify-center">
              <Trash2 aria-hidden="true" className="w-3.5 h-3.5 text-negative-600 dark:text-negative-400" strokeWidth={2} />
            </div>
            <span id="delete-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Delete counterparty
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-0.5"
            aria-label="Close"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{name}</span>?
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[var(--surface-3)] border-t border-gray-200 dark:border-[var(--border)] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-negative-500 hover:bg-negative-600 dark:bg-negative-600 dark:hover:bg-negative-500 rounded-full transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function CpRow({
  cp,
  onEdit,
  onToggle,
  onDelete,
}: {
  cp: Counterparty;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const hasLynq = cp.lynqName || cp.accountId;

  return (
    <tr className="hover-row border-b border-gray-100 dark:border-[var(--border)] last:border-0 transition-colors">
      {/* Name + active indicator */}
      <td className="pl-4 pr-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <CounterpartyAvatar name={cp.name} size={28} />
            <span className={`absolute -bottom-0.5 -right-0.5 block w-2 h-2 rounded-full border border-white dark:border-[var(--color-1)] ${cp.active ? 'bg-[var(--color-500)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
          </div>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{cp.name}</span>
        </div>
      </td>

      {/* Lynq account name */}
      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
        {cp.lynqName || <span className="text-gray-300 dark:text-gray-600">—</span>}
      </td>

      {/* Lynq account ID */}
      <td className="px-3 py-3">
        {cp.accountId ? (
          <span className="text-2xs font-mono text-gray-500 dark:text-gray-300 truncate block max-w-[200px]">
            {cp.accountId}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        )}
      </td>

      {/* Lynq badge */}
      <td className="px-3 py-3 text-center">
        {hasLynq && cp.active ? (
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-[var(--color-700)] dark:text-[var(--color-300)] bg-[var(--color-50)] border border-[var(--color-200)] rounded-full px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-[var(--color-500)] dark:bg-[var(--color-300)] inline-block" />
            Enabled
          </span>
        ) : hasLynq && !cp.active ? (
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-full px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-500 inline-block" />
            Inactive
          </span>
        ) : (
          <span className="text-2xs text-gray-400 dark:text-gray-600">Not set</span>
        )}
      </td>

      {/* Actions */}
      <td className="pr-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onToggle}
            title={cp.active ? 'Deactivate' : 'Activate'}
            className={`flex items-center gap-1 text-2xs font-medium transition-colors ${
              cp.active
                ? 'text-gray-500 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400'
                : 'text-gray-500 dark:text-gray-300 hover:text-positive-600 dark:hover:text-positive-400'
            }`}
          >
            {cp.active
              ? <UserMinus aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
              : <UserCheck  aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
            }
            {cp.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-[var(--color-300)] transition-colors"
          >
            <Pencil aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            title="Delete counterparty"
            className="text-2xs font-medium text-gray-400 dark:text-gray-600 hover:text-negative-500 dark:hover:text-negative-400 transition-colors flex items-center gap-1"
          >
            <Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main CounterpartiesView ────────────────────────────────────────────────────

export default function CounterpartiesView() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>(SEED);
  const [modal, setModal] = useState<'add' | { id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Counterparty | null>(null);
  const [search, setSearch] = useState('');

  const filtered = counterparties.filter((cp) =>
    cp.name.toLowerCase().includes(search.toLowerCase()) ||
    cp.lynqName.toLowerCase().includes(search.toLowerCase())
  );

  const editTarget = typeof modal === 'object' && modal !== null ? counterparties.find((c) => c.id === modal.id) : undefined;

  const handleAdd = (data: { name: string; lynqName: string; accountId: string }) => {
    setCounterparties((prev) => [
      ...prev,
      { id: String(Date.now()), ...data, active: true },
    ]);
    setModal(null);
  };

  const handleEdit = (data: { name: string; lynqName: string; accountId: string }) => {
    if (typeof modal !== 'object' || modal === null) return;
    setCounterparties((prev) =>
      prev.map((cp) => (cp.id === modal.id ? { ...cp, ...data } : cp))
    );
    setModal(null);
  };

  const handleToggle = (id: string) => {
    setCounterparties((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, active: !cp.active } : cp))
    );
  };

  const requestDelete = (cp: Counterparty) => { setDeleteTarget(cp); };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setCounterparties((prev) => prev.filter((cp) => cp.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const activeCount  = counterparties.filter((c) => c.active).length;
  const lynqCount    = counterparties.filter((c) => c.active && (c.lynqName || c.accountId)).length;
  const [tip, setTip] = useState<'active' | 'lynq' | 'settlement' | null>(null);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-[var(--surface-2)]">
      <div className="max-w-4xl mx-auto w-full px-6 py-6 space-y-5">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              <Users aria-hidden="true" className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2} />
              Counterparties
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">
              Manage counterparties and their Lynq settlement addresses.
            </p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)]"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add counterparty
          </button>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total */}
          <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md px-4 py-3">
            <p className="text-2xs text-gray-500 dark:text-gray-300 uppercase tracking-wide font-medium">Total</p>
            <p className="text-xl font-semibold tabular-nums mt-0.5 text-gray-900 dark:text-gray-100">
              <NumberFlow value={counterparties.length} />
            </p>
          </div>
          {/* Active */}
          <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md px-4 py-3">
            <span className="relative inline-flex items-center gap-1">
              <p className="text-2xs text-gray-500 dark:text-gray-300 uppercase tracking-wide font-medium">Active</p>
              <Info
                className="w-3 h-3 text-gray-300 dark:text-gray-600 cursor-default hover:text-gray-400 transition-colors"
                strokeWidth={2}
                onMouseEnter={() => setTip('active')}
                onMouseLeave={() => setTip(null)}
              />
              {tip === 'active' && (
                <div role="tooltip" className="absolute left-0 top-full mt-1 z-50 w-60 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 pointer-events-none whitespace-normal">
                  <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">Active counterparties</p>
                  <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                    Active counterparties are included in netting Cycles. Inactive ones are skipped — deactivate a counterparty to pause netting without removing their data.
                  </p>
                </div>
              )}
            </span>
            <p className="text-xl font-semibold tabular-nums mt-0.5 text-positive-600 dark:text-positive-400">
              <NumberFlow value={activeCount} />
            </p>
          </div>
          {/* Lynq-enabled */}
          <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md px-4 py-3">
            <span className="relative inline-flex items-center gap-1">
              <p className="text-2xs text-gray-500 dark:text-gray-300 uppercase tracking-wide font-medium">Lynq-enabled</p>
              <Info
                className="w-3 h-3 text-gray-300 dark:text-gray-600 cursor-default hover:text-gray-400 transition-colors"
                strokeWidth={2}
                onMouseEnter={() => setTip('lynq')}
                onMouseLeave={() => setTip(null)}
              />
              {tip === 'lynq' && (
                <div role="tooltip" className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 pointer-events-none whitespace-normal">
                  <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">Lynq settlement</p>
                  <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                    Counterparties with Lynq credentials configured can settle net obligations automatically via the Lynq <span className="font-mono">/v1/send/request</span> API. Configure in Settings.
                  </p>
                </div>
              )}
            </span>
            <p className="text-xl font-semibold tabular-nums mt-0.5 text-gray-800 dark:text-[var(--color-300)]">
              <NumberFlow value={lynqCount} />
            </p>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">

          {/* Table header with search */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--border)]">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {filtered.length} counterpart{filtered.length !== 1 ? 'ies' : 'y'}
            </span>
            <div className="relative">
              <Search aria-hidden="true" className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                aria-label="Search counterparties"
                className="text-xs pl-7 pr-3 py-1.5 border border-gray-200 dark:border-[var(--border)] rounded bg-gray-50 dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.35)] focus-visible:border-[oklch(0.683_0.106_127.892)] w-44 transition-colors"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <Users aria-hidden="true" className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" strokeWidth={1.5} />
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {search ? 'No counterparties match your search.' : 'No counterparties yet.'}
              </p>
              {!search && (
                <button
                  onClick={() => setModal('add')}
                  className="mt-3 text-xs font-medium text-gray-700 dark:text-[var(--color-300)] hover:underline"
                >
                  Add your first counterparty →
                </button>
              )}
            </div>
          ) : (
            <table className="w-full table-auto text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--surface-3)] border-b border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-300">
                  <th className="text-left pl-4 pr-3 py-2.5 font-medium w-[20%]">Name</th>
                  <th className="text-left px-3 py-2.5 font-medium w-[20%]">Lynq Account Name</th>
                  <th className="text-left px-3 py-2.5 font-medium">Lynq Account ID</th>
                  <th className="text-center px-3 py-2.5 font-medium whitespace-nowrap">
                    <span className="relative inline-flex items-center gap-1 justify-center">
                      Settlement
                      <Info
                        className="w-3 h-3 text-gray-300 dark:text-gray-600 cursor-default hover:text-gray-400 transition-colors"
                        strokeWidth={2}
                        onMouseEnter={() => setTip('settlement')}
                        onMouseLeave={() => setTip(null)}
                      />
                      {tip === 'settlement' && (
                        <div role="tooltip" className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 pointer-events-none whitespace-normal text-left font-normal normal-case tracking-normal">
                          <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">Lynq settlement</p>
                          <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                            When enabled, net obligations with this counterparty can settle automatically via the Lynq <span className="font-mono">/v1/send/request</span> API. Configure credentials in Settings.
                          </p>
                        </div>
                      )}
                    </span>
                  </th>
                  <th className="pr-4 py-2.5 whitespace-nowrap" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((cp) => (
                  <CpRow
                    key={cp.id}
                    cp={cp}
                    onEdit={() => setModal({ id: cp.id })}
                    onToggle={() => handleToggle(cp.id)}
                    onDelete={() => requestDelete(cp)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer note ─────────────────────────────────────────────── */}
        <div className="text-center pb-2">
          <p className="text-2xs text-gray-500 dark:text-gray-600">
            Prototype — counterparties are stored in memory only and reset on page reload.
          </p>
        </div>

      </div>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modal === 'add' && (
        <CpModal onSave={handleAdd} onClose={() => setModal(null)} />
      )}
      {typeof modal === 'object' && editTarget && (
        <CpModal initial={editTarget} onSave={handleEdit} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
