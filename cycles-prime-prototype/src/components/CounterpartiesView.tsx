import { useState, useRef, useEffect } from 'react';
import {
  User, X, Plus, Search, Users, Trash2, Pencil, ChevronRight,
} from 'lucide-react';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import type { Batch } from '../types';

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

// ── Form / modal types ─────────────────────────────────────────────────────────

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
        {label}{required && <span className="text-[--negative] ml-0.5">*</span>}
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
        className={`w-full text-xs px-3 py-2 border border-gray-300 dark:border-[--border] rounded
          bg-white dark:bg-[--surface-3] text-gray-900 dark:text-[--color-12]
          placeholder-gray-400 dark:placeholder-gray-500
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] focus-visible:border-[oklch(0.683_0.106_127.892)]
          transition-colors`}
      />
    </div>
  );
}

interface ModalProps {
  initial?: Counterparty;
  onSave: (data: FormState) => void;
  onClose: () => void;
}

export function AddCounterpartyModal({ onSave, onClose }: Omit<ModalProps, 'initial'>) {
  return <CpModal onSave={onSave} onClose={onClose} />;
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
        className="bg-white dark:bg-[--color-1] rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-[--border]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[--border]">
          <div className="flex items-center gap-2.5">
            {form.name.trim() ? (
              <CounterpartyAvatar name={form.name.trim()} size={28} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[--surface-3] flex items-center justify-center flex-shrink-0">
                <User aria-hidden="true" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              </div>
            )}
            <span id="cp-modal-title" className="text-sm font-semibold text-gray-900 dark:text-[--color-12]">
              {isEdit ? 'Edit counterparty' : 'Add counterparty'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-[--color-11] transition-colors rounded-full p-0.5"
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
        <div className="px-5 py-4 bg-gray-50 dark:bg-[--surface-3] border-t border-gray-200 dark:border-[--border] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[--surface-3] border border-gray-300 dark:border-[--border] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors
              ${valid
                ? 'text-gray-900 bg-[#CDF698] hover:bg-[--color-200]'
                : 'text-gray-500 bg-gray-100 dark:bg-[--surface-3] cursor-not-allowed'
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
        className="bg-white dark:bg-[--color-1] rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-[--border]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[--border]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[--negative]/15 flex items-center justify-center">
              <Trash2 aria-hidden="true" className="w-3.5 h-3.5 text-[--negative]" strokeWidth={2} />
            </div>
            <span id="delete-modal-title" className="text-sm font-semibold text-gray-900 dark:text-[--color-12]">
              Delete counterparty
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-[--color-11] transition-colors rounded-full p-0.5"
            aria-label="Close"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-xs text-gray-600 dark:text-[--color-11] leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900 dark:text-[--color-12]">{name}</span>?
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[--surface-3] border-t border-gray-200 dark:border-[--border] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[--surface-3] border border-gray-300 dark:border-[--border] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-[--negative] hover:opacity-90 rounded-full transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}



// ── Main CounterpartiesView ────────────────────────────────────────────────────
//
// Intentionally minimal: this page is a utility, not a dashboard. It lists
// counterparties, lets the user add / edit / remove them, and routes to the
// batches page filtered by the chosen counterparty. No KPIs, no per-CP stats,
// no aggregated metrics, no detail page.

export default function CounterpartiesView({ batches }: { batches: Batch[] }) {
  const [counterparties, setCounterparties] = useState<Counterparty[]>(SEED);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Counterparty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Counterparty | null>(null);
  const [search, setSearch] = useState('');

  // Merge SEED with any counterparty names that exist on batches but not in
  // the local CRUD list (so users see everyone they're transacting with).
  const seedNames = new Set(counterparties.map((c) => c.name));
  const extraNames = [...new Set(batches.map((b) => b.counterpartyName))].filter((n) => !seedNames.has(n));
  const allCounterparties: Counterparty[] = [
    ...counterparties,
    ...extraNames.map((n, i) => ({ id: `extra-${i}`, name: n, lynqName: '', accountId: '', active: true })),
  ];

  const filtered = allCounterparties.filter((cp) => {
    const q = search.toLowerCase();
    return cp.name.toLowerCase().includes(q) || cp.lynqName.toLowerCase().includes(q);
  });

  const goToBatches = (cpName: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-batch', { detail: { cpName } }));
  };

  const handleAdd = (data: FormState) => {
    setCounterparties((prev) => [...prev, { id: String(Date.now()), ...data, active: true }]);
    setShowAdd(false);
  };

  const handleEdit = (data: FormState) => {
    if (!editTarget) return;
    setCounterparties((prev) => prev.map((cp) => (cp.id === editTarget.id ? { ...cp, ...data } : cp)));
    setEditTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setCounterparties((prev) => prev.filter((cp) => cp.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">
        <h1 className="text-sm font-semibold text-[--color-12]">Counterparties</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search aria-hidden="true" size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--color-9]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search counterparties"
              className="text-xs pl-7 pr-3 py-1.5 border border-[--border] rounded bg-[--surface-2] text-[--color-12] placeholder-[--color-9] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors w-56"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[--color-200] rounded-full transition-colors"
          >
            <Plus aria-hidden="true" size={12} strokeWidth={2.5} />
            Add counterparty
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
            <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">All counterparties</span>
            <span className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">
              {filtered.length} counterpart{filtered.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <Users aria-hidden="true" className="w-8 h-8 opacity-40" strokeWidth={1.5} />
              <p className="text-sm">{search ? 'No counterparties match.' : 'No counterparties yet.'}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">Name</th>
                  <th className="text-left px-2 py-2 font-medium">Lynq account</th>
                  <th className="w-px pr-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cp) => (
                  <tr
                    key={cp.id}
                    onClick={() => goToBatches(cp.name)}
                    onKeyDown={(e) => { if (e.key === 'Enter') goToBatches(cp.name); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${cp.name} batches`}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
                  >
                    <td className="pl-4 pr-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <CounterpartyAvatar name={cp.name} size={20} />
                        <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white">{cp.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400">
                      {cp.lynqName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="pr-4 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditTarget(cp); }}
                          aria-label={`Edit ${cp.name}`}
                          className="p-1 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[var(--surface-2)] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          <Pencil aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(cp); }}
                          aria-label={`Delete ${cp.name}`}
                          className="p-1 rounded-full text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-[var(--negative)] transition-colors"
                        >
                          <Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                        </button>
                        <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-300 dark:text-gray-600" strokeWidth={2} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && <CpModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editTarget && <CpModal initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}
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
