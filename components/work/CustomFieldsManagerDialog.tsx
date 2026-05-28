"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { getCustomFields, createCustomField, deleteCustomField } from "@/lib/work/actions";
import type { CustomFieldDef } from "@/lib/work/types";
import { Modal } from "@/components/ui/Modal";

interface CustomFieldsManagerDialogProps {
  listId: string;
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "money", label: "Money" },
  { value: "percent", label: "Percent" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "label", label: "Label" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "rating", label: "Rating" },
  { value: "progress", label: "Progress" },
];

const TYPES_WITH_OPTIONS = ["dropdown", "label"];

export function CustomFieldsManagerDialog({
  listId,
  open,
  onClose,
  onChange,
}: CustomFieldsManagerDialogProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(false);

  // New field form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState(""); // comma-separated

  useEffect(() => {
    if (!open) return;
    getCustomFields(listId).then(setFields).catch(console.error);
  }, [open, listId]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this custom field? Values in existing tasks will be removed.")) return;
    setLoading(true);
    try {
      await deleteCustomField(id);
      setFields((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const config: Record<string, unknown> = {};
      if (TYPES_WITH_OPTIONS.includes(newType) && newOptions.trim()) {
        config.options = newOptions
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
      }
      const f = await createCustomField({
        list_id: listId,
        name: newName.trim(),
        field_type: newType,
        config,
      });
      setFields((prev) => [...prev, f as CustomFieldDef]);
      setNewName("");
      setNewOptions("");
      router.refresh();
      onChange();
    } finally {
      setLoading(false);
    }
  }

  function typeLabel(type: string): string {
    return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Custom Fields"
      size="md"
      footer={
        <button
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      {/* Existing fields */}
      <div className="mb-4 divide-y divide-border">
        {fields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No custom fields yet.</p>
        )}
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-3 py-2.5">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">{typeLabel(f.field_type)}</p>
            </div>
            {TYPES_WITH_OPTIONS.includes(f.field_type) &&
              Array.isArray((f.config as Record<string, unknown>)?.options) && (
                <div className="flex flex-wrap gap-1">
                  {((f.config as Record<string, unknown>).options as string[]).map((o) => (
                    <span
                      key={o}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              )}
            <button
              className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
              onClick={() => handleDelete(f.id)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Add Field
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Field name"
              className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {TYPES_WITH_OPTIONS.includes(newType) && (
            <input
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Options (comma-separated, e.g. A, B, C)"
              className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          )}

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim()}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Field
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
