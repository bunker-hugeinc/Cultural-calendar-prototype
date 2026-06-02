"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "existing",  label: "Mark as Existing Partner" },
  { value: "potential", label: "Move to Potential" },
  { value: "in_review", label: "Move to In Review" },
  { value: "approved",  label: "Approve" },
  { value: "dismissed", label: "Dismiss" },
] as const;

const STATUS_DISPLAY: Record<string, { pill: string; label: string }> = {
  existing:  { pill: "bg-gray-100 text-gray-700 border border-gray-200",    label: "Existing Partner" },
  potential: { pill: "bg-blue-50 text-blue-700 border border-blue-200",     label: "Potential" },
  in_review: { pill: "bg-amber-100 text-amber-700 border border-amber-200", label: "In Review" },
  approved:  { pill: "bg-green-100 text-green-700 border border-green-200", label: "Approved ✓" },
  dismissed: { pill: "bg-red-50 text-red-500 border border-red-100",        label: "Dismissed" },
};

const GROUPS = [
  "Travel & Staying",
  "Clothing",
  "Delivery & Rides",
  "Big Stores",
  "Sports & Entertainment",
  "Food",
  "Misc",
  "Kids",
];

interface Props {
  merchantId: string;
  initialStatus: string;
  initialGroup: string | null;
}

export function MerchantStatusPanel({ merchantId, initialStatus, initialGroup }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [group, setGroup] = useState(initialGroup ?? "");
  const [editingGroup, setEditingGroup] = useState(false);
  const [saving, setSaving] = useState(false);

  const display = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.existing;

  async function changeStatus(newStatus: string) {
    setSaving(true);
    await fetch(`/api/merchants/${merchantId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
    router.refresh();
  }

  async function saveGroup(newGroup: string) {
    setSaving(true);
    await fetch(`/api/merchants/${merchantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerGroup: newGroup || null }),
    });
    setGroup(newGroup);
    setEditingGroup(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white p-6 mb-6">
      <p className="eyebrow mb-4">Partner Status</p>
      <div className="flex items-center gap-4 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${display.pill}`}>
          {display.label}
        </span>
        <div className="relative">
          <select
            disabled={saving}
            onChange={(e) => { if (e.target.value) changeStatus(e.target.value); e.target.value = ""; }}
            defaultValue=""
            className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-apple-black cursor-pointer disabled:opacity-50"
          >
            <option value="" disabled>Change Status…</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-apple-gray-400 font-medium">Group:</span>
        {editingGroup ? (
          <div className="flex items-center gap-2">
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="rounded border bg-white px-2 py-1 text-sm"
              autoFocus
            >
              <option value="">— None —</option>
              {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button
              onClick={() => saveGroup(group)}
              disabled={saving}
              className="btn-primary-apple text-xs disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => { setEditingGroup(false); setGroup(initialGroup ?? ""); }} className="text-xs text-apple-gray-400 hover:text-apple-black">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm">{group || <span className="text-apple-gray-400 italic">None</span>}</span>
            <button onClick={() => setEditingGroup(true)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
          </div>
        )}
      </div>
    </div>
  );
}
