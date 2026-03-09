"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function EditDisplayName({
  userId,
  initialName,
  locale,
}: {
  userId: string;
  initialName: string | null;
  locale: Locale;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [saved, setSaved] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles")
      .update({ display_name: name || null })
      .eq("id", userId);

    if (err) {
      setError(t(locale, "displayName.saveError"));
    } else {
      setSaved(name);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setName(saved);
    setEditing(false);
    setError(null);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t(locale, "displayName.label")}: {saved || t(locale, "displayName.notSet")}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(locale, "displayName.placeholder")}
          className="h-8 w-48 text-sm"
          disabled={saving}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={saving}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} disabled={saving}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
