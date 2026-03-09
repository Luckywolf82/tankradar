import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Info } from "lucide-react";

const MAX_DISPLAY_NAME_LENGTH = 30;
const EMAIL_PATTERN = /[@]/;
const PHONE_PATTERN = /^\+?[\d\s\-]{7,}/;

function sanitizeAlias(value) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function validateAlias(value) {
  if (!value || value.trim().length === 0) return "Visningsnavn kan ikke være tomt.";
  if (value.trim().length > MAX_DISPLAY_NAME_LENGTH) return `Maks ${MAX_DISPLAY_NAME_LENGTH} tegn.`;
  if (EMAIL_PATTERN.test(value)) return "Visningsnavn kan ikke inneholde e-postadresse.";
  if (PHONE_PATTERN.test(value)) return "Visningsnavn kan ikke inneholde telefonnummer.";
  return null;
}

export default function PrivacySettings({ user, onSaved }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [showContributionAlias, setShowContributionAlias] = useState(user?.showContributionAlias || false);
  const [showGamificationPublicly, setShowGamificationPublicly] = useState(user?.showGamificationPublicly || false);
  const [allowIdentityInSocialSharing, setAllowIdentityInSocialSharing] = useState(user?.allowIdentityInSocialSharing || false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [aliasError, setAliasError] = useState(null);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    // Only validate alias if user has typed something
    if (trimmed.length > 0) {
      const err = validateAlias(trimmed);
      if (err) { setAliasError(err); return; }
    }
    setAliasError(null);
    setSaving(true);
    await base44.auth.updateMe({
      displayName: trimmed.length > 0 ? sanitizeAlias(trimmed) : null,
      showContributionAlias,
      showGamificationPublicly,
      allowIdentityInSocialSharing,
    });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
    if (onSaved) onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield size={17} className="text-green-600" />
          Personvern og visningsnavn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">

        {/* Alias */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Visningsnavn (alias)
          </label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="F.eks. BensinJeger"
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setAliasError(null); }}
          />
          <p className="text-xs text-slate-400 mt-1">{displayName.trim().length}/{MAX_DISPLAY_NAME_LENGTH} tegn. Ikke bruk ekte navn, e-post eller telefon.</p>
          {aliasError && <p className="text-xs text-red-500 mt-1">{aliasError}</p>}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
            Innstillingene under lagres nå, men aktiveres i en fremtidig fase. Bidrag vises alltid anonymt i MVP.
          </p>

          <Toggle
            label="Vis visningsnavn ved prisinnmeldinger"
            description="Ditt alias vises i stedet for 'Anonym bruker' (fremtidig funksjon)"
            checked={showContributionAlias}
            onChange={setShowContributionAlias}
          />

          <Toggle
            label="Vis poeng og merker offentlig"
            description="Gamification-elementer synlige for andre (fremtidig funksjon)"
            checked={showGamificationPublicly}
            onChange={setShowGamificationPublicly}
          />

          <Toggle
            label="Inkluder visningsnavn ved sosial deling"
            description="Alias kan vises når du deler priser eksternt (fremtidig funksjon)"
            checked={allowIdentityInSocialSharing}
            onChange={setAllowIdentityInSocialSharing}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? "Lagrer..." : savedOk ? "Lagret!" : "Lagre innstillinger"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none ${checked ? "bg-green-500" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}