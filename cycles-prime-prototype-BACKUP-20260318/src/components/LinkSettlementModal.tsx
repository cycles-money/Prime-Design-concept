import { useState, useEffect, useRef } from 'react';
import type { SettlementTarget } from '../types';
import { fmtUsdFull } from '../utils/formatters';
import { ChevronLeft, Check, Copy, Send } from 'lucide-react';

// ── Mock Lynq data (prototype — replace with real API/settings later) ─────────

const LYNQ_SENDER = 'TEST - Cycles';

const LYNQ_CONTACTS: Record<string, { lynqName: string; accountId: string }> = {
  'FalconX':        { lynqName: 'TEST - FalconX',    accountId: '0xf31c8b4e1a762d99c5abc21083abc001' },
  'Cumberland DRW': { lynqName: 'TEST - Cumberland',  accountId: '0xc82b9f1e0c4d3a87b5cde21094def002' },
  'B2C2':           { lynqName: 'TEST - B2C2',        accountId: '0xb2c2d8a1153d09277319035b0013ae03' },
  'Wintermute':     { lynqName: 'TEST - Wintermute',  accountId: '0xw1nt3r4d8b116ec9277731d9035b0004' },
  'Galaxy Digital': { lynqName: 'TEST - Galaxy',      accountId: '0xa985d8101de1153d0927731d9035b0005' },
  'Jump Trading':   { lynqName: 'TEST - Jump',        accountId: '0x1ump7rad1n60d8101de115d09277310006' },
};

function mockRequestId() {
  return `205101${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
}

function fmtTimestamp(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function truncateId(id: string, chars = 20) {
  if (id.length <= chars) return id;
  return id.slice(0, chars) + '…';
}

// ── Row helper ─────────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td
        className="px-4 py-2.5 text-xs font-medium text-gray-600 bg-[#e8f0f8] border-b border-r border-gray-200 whitespace-nowrap w-[44%]"
      >
        {label}
      </td>
      <td
        className={`px-4 py-2.5 text-xs text-gray-800 bg-white border-b border-gray-200 ${mono ? 'font-mono' : ''}`}
      >
        {value || <span className="text-gray-300">—</span>}
      </td>
    </tr>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  target: SettlementTarget;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LinkSettlementModal({ target, onClose, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [copied, setCopied] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const timestamp = useRef(new Date());

  const contact = LYNQ_CONTACTS[target.counterpartyName] ?? {
    lynqName: `TEST - ${target.counterpartyName}`,
    accountId: '0x0000000000000000000000000000000000000000',
  };

  useEffect(() => {
    if (!confirmed) confirmBtnRef.current?.focus();
  }, [confirmed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handleConfirm = () => {
    setRequestId(mockRequestId());
    setConfirmed(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.accountId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !confirmed && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lynq-modal-title"
        onKeyDown={handleKeyDown}
      >
        {/* ── Lynq blue header bar ──────────────────────────────────────── */}
        <div className="bg-[#0066cc] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!confirmed && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                SEND
              </button>
            )}
            {confirmed && (
              <span className="text-sm font-semibold tracking-wide">LYNQ</span>
            )}
            <span
              id="lynq-modal-title"
              className="bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded"
            >
              {LYNQ_SENDER}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/80">
            <span>Welcome, Benji</span>
            <button
              onClick={onClose}
              className="font-medium text-white/70 hover:text-white transition-colors underline underline-offset-1"
            >
              LOG OUT
            </button>
          </div>
        </div>

        {confirmed ? (
          /* ── Success state ──────────────────────────────────────────── */
          <div className="px-6 py-8 flex flex-col items-center text-center">
            {/* Green check in circle */}
            <div className="w-16 h-16 rounded-full bg-[#e8f5e9] border-2 border-[#4caf50] flex items-center justify-center mb-5">
              <Check className="w-8 h-8 text-[#4caf50]" strokeWidth={2.5} />
            </div>

            <p className="text-sm text-gray-700 mb-1">You have successfully submitted a transfer of</p>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              {fmtUsdFull(target.amountUsd)}
            </p>

            <p className="text-xs text-gray-500 mb-1">to</p>
            <p className="text-xs font-mono text-gray-700 bg-gray-100 rounded px-3 py-1.5 mb-4 break-all">
              {contact.accountId}
            </p>

            <p className="text-xs text-gray-500 leading-relaxed mb-1 max-w-xs">
              Transfers are processed in real-time. View complete details in your Transaction History.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Request ID: <span className="font-mono text-gray-600">{requestId}</span>
            </p>

            <button
              onClick={onConfirm}
              className="w-full max-w-xs bg-[#CDF698] hover:bg-[var(--color-200)] text-gray-900 text-sm font-semibold py-3 rounded-full transition-colors"
            >
              DONE
            </button>
          </div>
        ) : (
          /* ── Confirm Send state ─────────────────────────────────────── */
          <div className="bg-white">
            {/* Amount */}
            <div className="px-6 pt-6 pb-4">
              <p className="text-xs text-gray-500 mb-1">You are about to send</p>
              <p className="text-4xl font-semibold text-gray-900 tabular-nums">
                {fmtUsdFull(target.amountUsd)}
              </p>
            </div>

            {/* Details table */}
            <div className="mx-6 mb-5 rounded overflow-hidden border border-gray-200">
              <table className="w-full border-collapse text-left">
                <tbody>
                  <DetailRow label="Sender's Lynq Account Name"    value={LYNQ_SENDER} />
                  <DetailRow label="Recipient's Lynq Account Name" value={contact.lynqName} />
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-600 bg-[#e8f0f8] border-b border-r border-gray-200 whitespace-nowrap w-[44%]">
                      Recipient Account ID
                    </td>
                    <td className="px-4 py-2.5 text-xs bg-white border-b border-gray-200">
                      <span className="flex items-center gap-2 justify-between">
                        <span className="font-mono text-gray-800 text-[11px] truncate">
                          {truncateId(contact.accountId, 24)}
                        </span>
                        <button
                          onClick={handleCopy}
                          title="Copy account ID"
                          className="flex-shrink-0 text-gray-500 hover:text-[var(--color-800)] transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={2.5} />
                          ) : (
                            <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                          )}
                        </button>
                      </span>
                    </td>
                  </tr>
                  <DetailRow label="Purpose"             value="Intercompany Transfer" />
                  <DetailRow label="Public Description"  value="" />
                  <DetailRow label="Private Description" value="" />
                  <DetailRow label="Timestamp"           value={fmtTimestamp(timestamp.current)} />
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col items-center gap-3">
              <button
                ref={confirmBtnRef}
                onClick={handleConfirm}
                className="w-full bg-[#1a2b4a] hover:bg-[#162340] text-white text-sm font-semibold py-3 rounded-full transition-colors flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] focus-visible:outline-offset-2"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
                CONFIRM SEND
              </button>
              <button
                onClick={onClose}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-1"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
