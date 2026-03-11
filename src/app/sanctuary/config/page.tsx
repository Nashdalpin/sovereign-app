"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useFoco, Pillar, type RitualDefinition } from '@/lib/store';
import { RITUAL_ICON_MAP, RITUAL_ICON_KEYS } from '@/lib/ritual-icons';
import {
  Coins, Briefcase, Heart, User, ArrowLeft, Settings, Plus, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PILLAR_CONFIG } from '@/lib/constants';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .slice(0, 32) || 'ritual';
}

export default function SanctuaryConfigPage() {
  const { isHydrated, getPillarRituals, setPillarRituals, ritualDefinitions, addRitual, deleteRitual } = useFoco();
  const [newRitual, setNewRitual] = useState<{ label: string; labelPt: string; icon: string }>({
    label: '',
    labelPt: '',
    icon: 'moon',
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddRitual = () => {
    const label = newRitual.label.trim();
    if (!label) return;
    const labelPt = newRitual.labelPt.trim() || label;
    const id = slugify(label);
    if (ritualDefinitions.some((r) => r.id === id)) {
      setNewRitual((prev) => ({ ...prev, label: '', labelPt: '' }));
      return;
    }
    addRitual({ id, label, labelPt, icon: newRitual.icon });
    setNewRitual({ label: '', labelPt: '', icon: 'moon' });
    setShowAddForm(false);
  };

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-12 animate-in fade-in duration-1000">
      <header className="space-y-4">
        <Link
          href="/sanctuary"
          className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-all"
        >
          <ArrowLeft size={12} />
          Back to Altar
        </Link>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Settings size={28} className="text-primary opacity-50" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-30 gold-glow">Altar Configuration</p>
          <h1 className="text-5xl luxury-text">Maintenance Protocol</h1>
          <p className="text-[9px] font-medium uppercase tracking-[0.4em] opacity-20 max-w-xs mx-auto">
            Create or remove rituals and set which pillars they appear in.
          </p>
        </div>
      </header>

      <section className="luxury-blur p-6 rounded-[2.5rem] border border-white/5 luxury-shadow bg-black/20 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg luxury-text">Rituals</h2>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary/10"
            >
              <Plus size={14} />
              Add
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="p-4 rounded-[2rem] border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-50">New ritual</p>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-[8px] uppercase opacity-60">Name (EN)</Label>
                <Input
                  value={newRitual.label}
                  onChange={(e) => setNewRitual((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Reading"
                  className="rounded-full h-10 bg-white/[0.04] border-white/10 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] uppercase opacity-60">Display name (optional)</Label>
                <Input
                  value={newRitual.labelPt}
                  onChange={(e) => setNewRitual((p) => ({ ...p, labelPt: e.target.value }))}
                  placeholder="e.g. Reading"
                  className="rounded-full h-10 bg-white/[0.04] border-white/10 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] uppercase opacity-60">Icon</Label>
                <Select value={newRitual.icon} onValueChange={(v) => setNewRitual((p) => ({ ...p, icon: v }))}>
                  <SelectTrigger className="rounded-full h-10 bg-white/[0.04] border-white/10 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/10 bg-black/95">
                    {RITUAL_ICON_KEYS.map((key) => {
                      const Icon = RITUAL_ICON_MAP[key];
                      return (
                        <SelectItem key={key} value={key} className="flex items-center gap-2">
                          {Icon && <Icon size={14} />}
                          {key}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddRitual}
                disabled={!newRitual.label.trim()}
                className="flex-1 py-2.5 rounded-full bg-primary text-background text-[9px] font-black uppercase tracking-wider disabled:opacity-30"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewRitual({ label: '', labelPt: '', icon: 'moon' }); }}
                className="px-4 py-2.5 rounded-full border border-white/10 text-[9px] font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {ritualDefinitions.map((ritual) => {
            const IconComp = RITUAL_ICON_MAP[ritual.icon];
            return (
              <li
                key={ritual.id}
                className="flex items-center justify-between gap-4 p-3 rounded-[1.5rem] border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  {IconComp && <IconComp size={18} className="opacity-50" />}
                  <div>
                    <p className="text-[10px] font-bold">{ritual.label}</p>
                    <p className="text-[8px] opacity-50">{ritual.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRitual(ritual.id)}
                  disabled={ritualDefinitions.length <= 1}
                  aria-label={ritualDefinitions.length <= 1 ? 'At least one ritual must remain' : `Remove ritual ${ritual.label}`}
                  className="p-2 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title={ritualDefinitions.length <= 1 ? 'At least one ritual must remain.' : 'Remove ritual'}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.8em] opacity-30">Rituals per pillar</h2>
        {PILLAR_CONFIG.map((pillar) => {
          const currentRituals = getPillarRituals(pillar.id);
          return (
            <div
              key={pillar.id}
              className="luxury-blur p-6 rounded-[2.5rem] border border-white/5 luxury-shadow bg-black/20 space-y-4"
            >
              <div className="flex items-center gap-3">
                <pillar.icon size={20} className="text-primary opacity-40" />
                <h3 className="text-xl luxury-text">{pillar.label}</h3>
              </div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30">
                Rituals displayed in this pillar tab
              </p>
              <div className="flex flex-wrap gap-3">
                {ritualDefinitions.map((ritual) => {
                  const IconComp = RITUAL_ICON_MAP[ritual.icon];
                  const checked = currentRituals.includes(ritual.id);
                  return (
                    <label
                      key={ritual.id}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer rounded-full px-4 py-2.5 border transition-all",
                        checked ? "border-primary/40 bg-primary/5" : "border-white/5 opacity-50 hover:opacity-80"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          const next = checked
                            ? currentRituals.filter((r) => r !== ritual.id)
                            : [...currentRituals, ritual.id];
                          setPillarRituals(pillar.id, next);
                        }}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      {IconComp && <IconComp size={14} className="opacity-60" />}
                      <span className="text-[9px] font-bold uppercase tracking-wider">{ritual.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <div className="h-10" />
    </div>
  );
}
