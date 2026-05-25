"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCustomField,
  deleteCustomField,
  getCustomFields,
  setTaskCustomField,
} from "@/lib/work/actions";
import type { CustomFieldDef } from "@/lib/work/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
];

interface Props {
  taskId: string;
  listId: string;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function CustomFieldsPanel({ taskId, listId, values, onChange }: Props) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const d = await getCustomFields(listId);
      if (!cancel) setDefs(d);
    })();
    return () => {
      cancel = true;
    };
  }, [listId]);

  function addField() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const f = await createCustomField({
        list_id: listId,
        name: newName.trim(),
        field_type: newType,
      });
      setDefs((cur) => [...cur, f]);
      setNewName("");
      setShowNew(false);
    });
  }

  function removeField(id: string) {
    if (!confirm("Remove this field from the list?")) return;
    startTransition(async () => {
      await deleteCustomField(id);
      setDefs((cur) => cur.filter((d) => d.id !== id));
    });
  }

  function setValue(fieldId: string, value: unknown) {
    onChange({ ...values, [fieldId]: value });
    startTransition(async () => {
      await setTaskCustomField(taskId, fieldId, value);
    });
  }

  return (
    <div className="space-y-3">
      {defs.length === 0 ? (
        <p className="text-xs text-zinc-500">No custom fields defined for this list yet.</p>
      ) : null}

      {defs.map((d) => (
        <div key={d.id} className="flex items-start gap-3">
          <div className="w-32 shrink-0 pt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {d.name}
          </div>
          <div className="flex-1">
            <FieldInput
              def={d}
              value={values[d.id]}
              onChange={(v) => setValue(d.id, v)}
            />
          </div>
          <button
            onClick={() => removeField(d.id)}
            className="mt-2 text-xs text-zinc-400 hover:text-red-600"
            title="Remove field from list"
          >
            ×
          </button>
        </div>
      ))}

      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        {showNew ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <Label>Field name</Label>
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Budget, Sprint, Vendor"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  options={FIELD_TYPES}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addField} disabled={pending || !newName.trim()}>
                Add field
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>
            + Add custom field
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (def.field_type) {
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | undefined) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-600"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "url":
      return (
        <Input
          type="url"
          placeholder="https://…"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "select": {
      const opts = (def.config?.options as string[] | undefined) ?? [];
      return (
        <Select
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          options={[{ value: "", label: "—" }, ...opts.map((o) => ({ value: o, label: o }))]}
        />
      );
    }
    default:
      return (
        <Input
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}
