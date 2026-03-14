
"use client"

import React, { useState, useMemo } from 'react';
import { useFoco, Pillar } from '@/lib/store';
import { RITUAL_ICON_MAP } from '@/lib/ritual-icons';
import { CheckCircle2, ArrowRight, Focus, Gem, Banknote, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { PILLAR_CONFIG } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { RitualNumericHistory } from '@/lib/store';

function NumericRitualHistory({ ritualId, history, unit, maxPoints = 7 }: { ritualId: string; history: RitualNumericHistory; unit?: string; maxPoints?: number }) {
  const points = history
    .filter((e) => e.ritualId === ritualId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxPoints);
  if (points.length === 0) return null;
  return (
    <p className="text-[8px] opacity-50 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5" aria-label={`History: ${points.map((p) => `${p.date} ${p.value}${unit ?? ''}`).join(', ')}`}>
      {points.map((p) => (
        <span key={p.date} className="tabular-nums">
          {new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} {p.value}{unit ? ` ${unit}` : ''}
        </span>
      ))}
    </p>
  );
}

export default function SanctuaryPage() {
  const { vitals, toggleVital, isHydrated, getPriorityAsset, getChildrenOf, assetAnalytics, getPillarRituals, ritualDefinitions, assets, addGoalEntry, ritualNumericValues, ritualNumericHistory, setRitualNumericValue } = useFoco();
  const ritualById = Object.fromEntries(ritualDefinitions.map((r) => [r.id, r]));
  const { toast } = useToast();
  const [entryModalAssetId, setEntryModalAssetId] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');

  const capitalMoneyGoals = useMemo(() => {
    const list = assets.filter(a => a.category === 'capital' && (a.targetType ?? 'hours') === 'money');
    return [...list].sort((a, b) => {
      const aRoot = a.parentAssetId ?? a.id;
      const bRoot = b.parentAssetId ?? b.id;
      if (aRoot !== bRoot) return aRoot.localeCompare(bRoot);
      return (a.stepOrder ?? 0) - (b.stepOrder ?? 0);
    });
  }, [assets]);

  const vitalityMoneyGoals = useMemo(() => {
    const list = assets.filter(a => a.category === 'vitality' && (a.targetType ?? 'hours') === 'money');
    return [...list].sort((a, b) => {
      const aRoot = a.parentAssetId ?? a.id;
      const bRoot = b.parentAssetId ?? b.id;
      if (aRoot !== bRoot) return aRoot.localeCompare(bRoot);
      return (a.stepOrder ?? 0) - (b.stepOrder ?? 0);
    });
  }, [assets]);

  const handleAddEntry = () => {
    if (!entryModalAssetId || !entryAmount) return;
    const amount = parseFloat(entryAmount.replace(',', '.'));
    if (!(amount > 0)) return;
    addGoalEntry(entryModalAssetId, amount, entryNote || null);
    setEntryModalAssetId(null);
    setEntryAmount('');
    setEntryNote('');
    toast({ title: 'Entry recorded', description: `${amount} € added to goal.`, variant: 'elegant' });
  };

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] text-muted-foreground animate-pulse">
          Initializing Altar...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-12 animate-in fade-in duration-1000">
      <header className="text-center space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-30 gold-glow">The Ritual</p>
        <h1 className="text-5xl luxury-text">Altar.</h1>
        <Link
          href="/sanctuary/vault"
          className="inline-flex items-center gap-3 px-6 py-4 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-background transition-all luxury-blur luxury-shadow text-[10px] font-black uppercase tracking-[0.6em]"
        >
          <Gem size={18} strokeWidth={1.5} />
          Open Vault
        </Link>
      </header>

      <Tabs defaultValue="vitality" className="w-full space-y-12">
        <TabsList className="w-full h-14 bg-muted/50 dark:bg-white/10 rounded-full p-1.5 luxury-blur flex justify-between border border-border dark:border-white/15">
          {PILLAR_CONFIG.map(p => (
            <TabsTrigger 
              key={p.id} value={p.id}
              className="flex-1 rounded-full text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-700 py-1.5"
            >
              <p.icon size={16} strokeWidth={1.5} />
            </TabsTrigger>
          ))}
        </TabsList>

        {PILLAR_CONFIG.map(pillar => {
          const isCapital = pillar.id === 'capital';
          const isVitality = pillar.id === 'vitality';
          const alphaMandate = getPriorityAsset(pillar.id);
          const analytics = alphaMandate ? assetAnalytics(alphaMandate.id) : null;
          const progress = alphaMandate ? Math.min(100, (alphaMandate.investedHours / alphaMandate.targetHours) * 100) : 0;
          const moneyGoals = assets.filter(a => a.category === pillar.id && (a.targetType ?? 'hours') === 'money');
          const capitalHoursGoals = assets.filter(a => a.category === 'capital' && (a.targetType ?? 'hours') === 'hours');
          const vitalityHoursGoals = assets.filter(a => a.category === 'vitality' && (a.targetType ?? 'hours') === 'hours');

          if (isCapital) {
            return (
              <TabsContent key={pillar.id} value={pillar.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl luxury-text">Capital</h2>
                  <p className="text-[8px] font-bold uppercase tracking-[0.6em] text-muted-foreground">Finance & savings goals</p>
                </div>

                {getPillarRituals(pillar.id).length > 0 && (
                  <div className="space-y-6">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground px-2">Maintenance Protocol</p>
                    <div className="grid gap-3">
                      {getPillarRituals(pillar.id).map(rid => {
                        const ritual = ritualById[rid];
                        const IconComp = ritual ? RITUAL_ICON_MAP[ritual.icon] : null;
                        if (!ritual || !IconComp) return null;
                        if (ritual.type === 'number') {
                          const value = ritualNumericValues[rid];
                          const hasValue = value != null;
                          const hintId = `ritual-num-${rid}-hint`;
                          return (
                            <div
                              key={rid}
                              role="group"
                              aria-labelledby={`ritual-num-${rid}-label`}
                              className={cn(
                                "w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700",
                                hasValue ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-80"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                  hasValue ? "bg-primary text-background" : "bg-white/5 text-white/20"
                                )}>
                                  <IconComp size={16} strokeWidth={1.5} aria-hidden />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p id={`ritual-num-${rid}-label`} className="text-[10px] font-bold uppercase tracking-widest truncate">{ritual.label}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                      type="number"
                                      value={value != null ? value : ''}
                                      onChange={(e) => { const v = e.target.value; if (v === '') setRitualNumericValue(rid, null); else { const n = parseFloat(v); if (!Number.isNaN(n)) setRitualNumericValue(rid, n); } }}
                                      placeholder="Today"
                                      aria-label={`Today's value for ${ritual.label}${ritual.unit ? ` in ${ritual.unit}` : ''}`}
                                      aria-describedby={(ritual.unit || ritual.targetValue != null) ? hintId : undefined}
                                      className="w-20 rounded-full h-8 bg-black/20 dark:bg-white/10 border border-white/10 px-3 text-[11px] tabular-nums"
                                    />
                                    {(ritual.unit || ritual.targetValue != null) && (
                                      <span id={hintId} className="text-[8px] opacity-50" aria-hidden="true">
                                        {ritual.unit ?? ''}{ritual.targetValue != null ? ` → ${ritual.targetValue}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <NumericRitualHistory ritualId={rid} history={ritualNumericHistory} unit={ritual.unit} />
                                </div>
                                {hasValue && <CheckCircle2 size={14} className="text-primary gold-glow shrink-0" aria-label={`${ritual.label} value recorded`} />}
                              </div>
                            </div>
                          );
                        }
                        const isActive = !!vitals[rid];
                        return (
                          <button
                            key={rid}
                            onClick={() => toggleVital(rid)}
                            aria-label={isActive ? `Mark ${ritual.label} as incomplete` : `Mark ${ritual.label} as complete`}
                            aria-pressed={isActive}
                            className={cn(
                              "w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700 text-left flex items-center justify-between",
                              isActive ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-40 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700",
                                isActive ? "bg-primary text-background" : "bg-white/5 text-white/20"
                              )}>
                                <IconComp size={16} strokeWidth={1.5} />
                              </div>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-primary gold-glow" : "text-muted-foreground")}>{ritual.label}</p>
                            </div>
                            {isActive && <CheckCircle2 size={14} className="text-primary gold-glow" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground flex items-center gap-2">
                      <Banknote size={12} /> Savings goals
                    </p>
                    <Link href="/sanctuary/vault" className="p-2 text-muted-foreground hover:text-foreground transition-all text-[8px] font-bold uppercase tracking-wider">
                      Vault
                    </Link>
                  </div>

                  {capitalMoneyGoals.length === 0 ? (
                    <Link href="/sanctuary/vault" className="block p-10 text-center text-muted-foreground border border-dashed border-border dark:border-white/10 rounded-[2.5rem] hover:text-foreground hover:border-foreground/20 transition-all bg-muted/20 dark:bg-white/5">
                      <Banknote size={24} className="mx-auto mb-3 opacity-60" />
                      <p className="text-[9px] font-black uppercase tracking-[0.6em]">No savings goals yet</p>
                      <p className="text-[8px] opacity-50 mt-1">Create one in the Vault</p>
                    </Link>
                  ) : (
                    <div className="space-y-4">
                      {capitalMoneyGoals.map((m) => {
                        const pct = (m.targetAmount ?? 0) > 0 ? Math.min(100, ((m.investedAmount ?? 0) / (m.targetAmount ?? 1)) * 100) : 0;
                        const isChild = !!m.parentAssetId;
                        const parentName = m.parentAssetId ? assets.find(a => a.id === m.parentAssetId)?.name : null;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "luxury-blur p-5 rounded-[2rem] border border-white/5 luxury-shadow space-y-3",
                              isChild && "ml-4 border-l-2 border-l-primary/20"
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {isChild && <span className="text-[7px] font-black uppercase opacity-50">Step {m.stepOrder ?? '?'}</span>}
                              <p className="text-sm font-light">{m.name}</p>
                              {parentName && <span className="text-[7px] opacity-50">→ {parentName}</span>}
                            </div>
                            <div className="flex justify-between items-center text-[9px] tabular-nums">
                              <span className="text-primary">{(m.investedAmount ?? 0).toFixed(0)} € / {(m.targetAmount ?? 0).toFixed(0)} €</span>
                              <span className="opacity-70">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                            <button
                              onClick={() => { setEntryModalAssetId(m.id); setEntryAmount(''); setEntryNote(''); }}
                              className="w-full mt-2 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-background transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={12} /> Add entry
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {capitalHoursGoals.length > 0 && alphaMandate && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Focus (hours)</p>
                      <Link href="/sanctuary/vault" className="p-2 text-muted-foreground hover:text-foreground transition-all">
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                    <div className="luxury-blur p-6 rounded-[2.5rem] space-y-6 border border-white/5 luxury-shadow relative overflow-hidden bg-black/40">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg luxury-text">{alphaMandate.parentAssetId ? `Next step: ${alphaMandate.name}` : alphaMandate.name}</h3>
                          <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full border border-primary/40 text-primary bg-primary/10">ALPHA</span>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">
                          {alphaMandate.parentAssetId
                            ? (() => { const parent = assets.find(a => a.id === alphaMandate.parentAssetId); return parent ? `Step ${alphaMandate.stepOrder ?? '?'} of ${parent.name} · ${alphaMandate.targetHours}h` : `${alphaMandate.targetHours}h Mandate`; })()
                            : `${alphaMandate.targetHours}h Mandate`}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-2xl font-light tabular-nums tracking-tighter">
                            {alphaMandate.investedHours.toFixed(1)}
                            <span className="text-[8px] opacity-20 ml-1.5 uppercase tracking-[0.4em]">H</span>
                          </p>
                          <p className={cn("text-base font-light tabular-nums", analytics?.status === 'critical' ? 'text-destructive' : 'text-primary gold-glow')}>{progress.toFixed(1)}%</p>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all duration-1000", analytics?.status === 'critical' ? 'bg-destructive' : 'bg-primary gold-glow')} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {alphaMandate.parentAssetId && (() => {
                        const parent = assets.find(a => a.id === alphaMandate.parentAssetId);
                        if (!parent) return null;
                        const pathSteps = getChildrenOf(parent.id);
                        if (pathSteps.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                            {pathSteps.map((step) => {
                              const isCurrent = step.id === alphaMandate.id;
                              const isComplete = step.investedHours >= step.targetHours;
                              return (
                                <span
                                  key={step.id}
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-wider transition-all",
                                    isCurrent ? "bg-primary/20 text-primary border border-primary/40" : isComplete ? "bg-white/10 opacity-60" : "opacity-40"
                                  )}
                                >
                                  {isComplete ? '✓' : ''} Step {step.stepOrder ?? ''}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <Link href="/today" className="block">
                      <button className="w-full h-14 rounded-full bg-primary text-background text-[10px] font-black uppercase tracking-[0.8em] luxury-shadow hover:scale-[1.01] active:scale-95 transition-all duration-500 gold-glow">
                        Activate Alpha
                      </button>
                    </Link>
                  </div>
                )}

                {capitalMoneyGoals.length > 0 && (
                  <Link href="/sanctuary/vault" className="block">
                    <button className="w-full h-12 rounded-full border border-border dark:border-white/15 text-[9px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-all">
                      Manage all in Vault
                    </button>
                  </Link>
                )}
              </TabsContent>
            );
          }

          if (isVitality) {
            return (
              <TabsContent key={pillar.id} value={pillar.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl luxury-text">Vitality</h2>
                  <p className="text-[8px] font-bold uppercase tracking-[0.6em] text-muted-foreground">Health & life goals</p>
                </div>

                {getPillarRituals(pillar.id).length > 0 && (
                  <div className="space-y-6">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground px-2">Maintenance Protocol</p>
                    <div className="grid gap-3">
                      {getPillarRituals(pillar.id).map(rid => {
                        const ritual = ritualById[rid];
                        const IconComp = ritual ? RITUAL_ICON_MAP[ritual.icon] : null;
                        if (!ritual || !IconComp) return null;
                        if (ritual.type === 'number') {
                          const value = ritualNumericValues[rid];
                          const hasValue = value != null;
                          const hintId = `ritual-num-${rid}-hint`;
                          return (
                            <div key={rid} role="group" aria-labelledby={`ritual-num-${rid}-label`} className={cn("w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700", hasValue ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-80")}>
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", hasValue ? "bg-primary text-background" : "bg-white/5 text-white/20")}>
                                  <IconComp size={16} strokeWidth={1.5} aria-hidden />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p id={`ritual-num-${rid}-label`} className="text-[10px] font-bold uppercase tracking-widest truncate">{ritual.label}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <input type="number" value={value != null ? value : ''} onChange={(e) => { const v = e.target.value; if (v === '') setRitualNumericValue(rid, null); else { const n = parseFloat(v); if (!Number.isNaN(n)) setRitualNumericValue(rid, n); } }} placeholder="Today" aria-label={`Today's value for ${ritual.label}${ritual.unit ? ` in ${ritual.unit}` : ''}`} aria-describedby={(ritual.unit || ritual.targetValue != null) ? hintId : undefined} className="w-20 rounded-full h-8 bg-black/20 dark:bg-white/10 border border-white/10 px-3 text-[11px] tabular-nums" />
                                    {(ritual.unit || ritual.targetValue != null) && <span id={hintId} className="text-[8px] opacity-50" aria-hidden="true">{ritual.unit ?? ''}{ritual.targetValue != null ? ` → ${ritual.targetValue}` : ''}</span>}
                                  </div>
                                  <NumericRitualHistory ritualId={rid} history={ritualNumericHistory} unit={ritual.unit} />
                                </div>
                                {hasValue && <CheckCircle2 size={14} className="text-primary gold-glow shrink-0" aria-label={`${ritual.label} value recorded`} />}
                              </div>
                            </div>
                          );
                        }
                        const isActive = !!vitals[rid];
                        return (
                          <button key={rid} onClick={() => toggleVital(rid)} aria-label={isActive ? `Mark ${ritual.label} as incomplete` : `Mark ${ritual.label} as complete`} aria-pressed={isActive} className={cn("w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700 text-left flex items-center justify-between", isActive ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-40 hover:opacity-100")}>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700", isActive ? "bg-primary text-background" : "bg-white/5 text-white/20")}><IconComp size={16} strokeWidth={1.5} /></div>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-primary gold-glow" : "text-muted-foreground")}>{ritual.label}</p>
                            </div>
                            {isActive && <CheckCircle2 size={14} className="text-primary gold-glow" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground flex items-center gap-2">
                      <Banknote size={12} /> Money goals
                    </p>
                    <Link href="/sanctuary/vault" className="p-2 text-muted-foreground hover:text-foreground transition-all text-[8px] font-bold uppercase tracking-wider">
                      Vault
                    </Link>
                  </div>

                  {vitalityMoneyGoals.length === 0 ? (
                    <Link href="/sanctuary/vault" className="block p-10 text-center text-muted-foreground border border-dashed border-border dark:border-white/10 rounded-[2.5rem] hover:text-foreground transition-all bg-muted/20 dark:bg-white/5">
                      <Banknote size={24} className="mx-auto mb-3 opacity-60" />
                      <p className="text-[9px] font-black uppercase tracking-[0.6em]">No money goals yet</p>
                      <p className="text-[8px] opacity-50 mt-1">e.g. dentist, medical procedure — create in Vault</p>
                    </Link>
                  ) : (
                    <div className="space-y-4">
                      {vitalityMoneyGoals.map((m) => {
                        const pct = (m.targetAmount ?? 0) > 0 ? Math.min(100, ((m.investedAmount ?? 0) / (m.targetAmount ?? 1)) * 100) : 0;
                        const isChild = !!m.parentAssetId;
                        const parentName = m.parentAssetId ? assets.find(a => a.id === m.parentAssetId)?.name : null;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "luxury-blur p-5 rounded-[2rem] border border-white/5 luxury-shadow space-y-3",
                              isChild && "ml-4 border-l-2 border-l-primary/20"
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {isChild && <span className="text-[7px] font-black uppercase opacity-50">Step {m.stepOrder ?? '?'}</span>}
                              <p className="text-sm font-light">{m.name}</p>
                              {parentName && <span className="text-[7px] opacity-50">→ {parentName}</span>}
                            </div>
                            <div className="flex justify-between items-center text-[9px] tabular-nums">
                              <span className="text-primary">{(m.investedAmount ?? 0).toFixed(0)} € / {(m.targetAmount ?? 0).toFixed(0)} €</span>
                              <span className="opacity-70">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                            <button
                              onClick={() => { setEntryModalAssetId(m.id); setEntryAmount(''); setEntryNote(''); }}
                              className="w-full mt-2 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-background transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={12} /> Add entry
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {vitalityHoursGoals.length > 0 && alphaMandate && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Focus (hours)</p>
                      <Link href="/sanctuary/vault" className="p-2 text-muted-foreground hover:text-foreground transition-all">
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                    <div className="luxury-blur p-6 rounded-[2.5rem] space-y-6 border border-white/5 luxury-shadow relative overflow-hidden bg-black/40">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg luxury-text">{alphaMandate.parentAssetId ? `Next step: ${alphaMandate.name}` : alphaMandate.name}</h3>
                          <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full border border-primary/40 text-primary bg-primary/10">ALPHA</span>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">
                          {alphaMandate.parentAssetId
                            ? (() => { const parent = assets.find(a => a.id === alphaMandate.parentAssetId); return parent ? `Step ${alphaMandate.stepOrder ?? '?'} of ${parent.name} · ${alphaMandate.targetHours}h` : `${alphaMandate.targetHours}h Mandate`; })()
                            : `${alphaMandate.targetHours}h Mandate`}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-2xl font-light tabular-nums tracking-tighter">
                            {alphaMandate.investedHours.toFixed(1)}
                            <span className="text-[8px] opacity-20 ml-1.5 uppercase tracking-[0.4em]">H</span>
                          </p>
                          <p className={cn("text-base font-light tabular-nums", analytics?.status === 'critical' ? 'text-destructive' : 'text-primary gold-glow')}>{progress.toFixed(1)}%</p>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all duration-1000", analytics?.status === 'critical' ? 'bg-destructive' : 'bg-primary gold-glow')} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {alphaMandate.parentAssetId && (() => {
                        const parent = assets.find(a => a.id === alphaMandate.parentAssetId);
                        if (!parent) return null;
                        const pathSteps = getChildrenOf(parent.id);
                        if (pathSteps.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                            {pathSteps.map((step) => {
                              const isCurrent = step.id === alphaMandate.id;
                              const isComplete = step.investedHours >= step.targetHours;
                              return (
                                <span
                                  key={step.id}
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-wider transition-all",
                                    isCurrent ? "bg-primary/20 text-primary border border-primary/40" : isComplete ? "bg-white/10 opacity-60" : "opacity-40"
                                  )}
                                >
                                  {isComplete ? '✓' : ''} Step {step.stepOrder ?? ''}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <Link href="/today" className="block">
                      <button className="w-full h-14 rounded-full bg-primary text-background text-[10px] font-black uppercase tracking-[0.8em] luxury-shadow hover:scale-[1.01] active:scale-95 transition-all duration-500 gold-glow">
                        Activate Alpha
                      </button>
                    </Link>
                  </div>
                )}

                {assets.filter(a => a.category === 'vitality' && a.linkedCapitalAssetId).length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground px-2 flex items-center gap-2">
                      <Banknote size={12} /> Funding (Capital sub-goals)
                    </p>
                    {assets.filter(a => a.category === 'vitality' && a.linkedCapitalAssetId).map((source) => {
                      const cap = assets.find(c => c.id === source.linkedCapitalAssetId);
                      if (!cap || (cap.targetType ?? 'hours') !== 'money') return null;
                      const pct = (cap.targetAmount ?? 0) > 0 ? Math.min(100, ((cap.investedAmount ?? 0) / (cap.targetAmount ?? 1)) * 100) : 0;
                      return (
                        <div key={source.id} className="luxury-blur p-5 rounded-[2rem] border border-white/5 luxury-shadow space-y-3">
                          <p className="text-[9px] opacity-60">Funding for: {source.name}</p>
                          <div className="flex justify-between items-center text-[9px] tabular-nums">
                            <span className="text-primary">{(cap.investedAmount ?? 0).toFixed(0)} € / {(cap.targetAmount ?? 0).toFixed(0)} €</span>
                            <span className="opacity-70">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            onClick={() => { setEntryModalAssetId(cap.id); setEntryAmount(''); setEntryNote(''); }}
                            className="w-full mt-2 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-background transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={12} /> Add entry
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {vitalityMoneyGoals.length > 0 && (
                  <Link href="/sanctuary/vault" className="block">
                    <button className="w-full h-12 rounded-full border border-border dark:border-white/15 text-[9px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-all">
                      Manage all in Vault
                    </button>
                  </Link>
                )}
              </TabsContent>
            );
          }

          return (
            <TabsContent key={pillar.id} value={pillar.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="text-center space-y-1">
                <h2 className="text-2xl luxury-text">{pillar.label}</h2>
                <p className="text-[8px] font-bold uppercase tracking-[0.6em] text-muted-foreground">{pillar.description}</p>
              </div>

              {getPillarRituals(pillar.id).length > 0 && (
                <div className="space-y-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground px-2">Maintenance Protocol</p>
                  <div className="grid gap-3">
                    {getPillarRituals(pillar.id).map(rid => {
                      const ritual = ritualById[rid];
                      const IconComp = ritual ? RITUAL_ICON_MAP[ritual.icon] : null;
                      if (!ritual || !IconComp) return null;
                      if (ritual.type === 'number') {
                        const value = ritualNumericValues[rid];
                        const hasValue = value != null;
                        const hintId = `ritual-num-${rid}-hint`;
                        return (
                          <div key={rid} role="group" aria-labelledby={`ritual-num-${rid}-label`} className={cn("w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700", hasValue ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-80")}>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", hasValue ? "bg-primary text-background" : "bg-white/5 text-white/20")}><IconComp size={16} strokeWidth={1.5} aria-hidden /></div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p id={`ritual-num-${rid}-label`} className="text-[10px] font-bold uppercase tracking-widest truncate">{ritual.label}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input type="number" value={value != null ? value : ''} onChange={(e) => { const v = e.target.value; if (v === '') setRitualNumericValue(rid, null); else { const n = parseFloat(v); if (!Number.isNaN(n)) setRitualNumericValue(rid, n); } }} placeholder="Today" aria-label={`Today's value for ${ritual.label}${ritual.unit ? ` in ${ritual.unit}` : ''}`} aria-describedby={(ritual.unit || ritual.targetValue != null) ? hintId : undefined} className="w-20 rounded-full h-8 bg-black/20 dark:bg-white/10 border border-white/10 px-3 text-[11px] tabular-nums" />
                                  {(ritual.unit || ritual.targetValue != null) && <span id={hintId} className="text-[8px] opacity-50" aria-hidden="true">{ritual.unit ?? ''}{ritual.targetValue != null ? ` → ${ritual.targetValue}` : ''}</span>}
                                </div>
                                <NumericRitualHistory ritualId={rid} history={ritualNumericHistory} unit={ritual.unit} />
                              </div>
                              {hasValue && <CheckCircle2 size={14} className="text-primary gold-glow shrink-0" aria-label={`${ritual.label} value recorded`} />}
                            </div>
                          </div>
                        );
                      }
                      const isActive = !!vitals[rid];
                      return (
                        <button key={rid} onClick={() => toggleVital(rid)} aria-label={isActive ? `Mark ${ritual.label} as incomplete` : `Mark ${ritual.label} as complete`} aria-pressed={isActive} className={cn("w-full luxury-blur p-4 rounded-[2rem] border transition-all duration-700 text-left flex items-center justify-between", isActive ? "border-primary/30 bg-primary/5" : "border-white/5 opacity-40 hover:opacity-100")}>
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700", isActive ? "bg-primary text-background" : "bg-white/5 text-white/20")}><IconComp size={16} strokeWidth={1.5} /></div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-primary gold-glow" : "text-muted-foreground")}>{ritual.label}</p>
                          </div>
                          {isActive && <CheckCircle2 size={14} className="text-primary gold-glow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Alpha Mandate</p>
                  <Link href="/sanctuary/vault" className="p-2 text-muted-foreground hover:text-foreground transition-all">
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {!alphaMandate && moneyGoals.length === 0 ? (
                  <Link href="/sanctuary/vault" className="block p-10 text-center text-muted-foreground border border-dashed border-border dark:border-white/10 rounded-[2.5rem] hover:text-foreground transition-all bg-muted/20 dark:bg-white/5">
                    <Focus size={24} className="mx-auto mb-3 opacity-60" />
                    <p className="text-[9px] font-black uppercase tracking-[0.6em]">Establish Alpha</p>
                  </Link>
                ) : !alphaMandate && moneyGoals.length > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {moneyGoals.map((m) => {
                        const pct = (m.targetAmount ?? 0) > 0 ? Math.min(100, ((m.investedAmount ?? 0) / (m.targetAmount ?? 1)) * 100) : 0;
                        return (
                          <div key={m.id} className="luxury-blur p-5 rounded-[2rem] border border-white/5 luxury-shadow space-y-3">
                            <p className="text-sm font-light">{m.name}</p>
                            <div className="flex justify-between items-center text-[9px] tabular-nums">
                              <span className="text-primary">{(m.investedAmount ?? 0).toFixed(0)} € / {(m.targetAmount ?? 0).toFixed(0)} €</span>
                              <span className="opacity-70">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                            <button
                              onClick={() => { setEntryModalAssetId(m.id); setEntryAmount(''); setEntryNote(''); }}
                              className="w-full mt-2 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-background transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={12} /> Add entry
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <Link href="/sanctuary/vault" className="block">
                      <button className="w-full h-14 rounded-full border border-primary/40 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.8em] hover:bg-primary hover:text-background transition-all">
                        Manage in Vault
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="luxury-blur p-6 rounded-[2.5rem] space-y-6 border border-white/5 luxury-shadow relative overflow-hidden bg-black/40">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg luxury-text">{alphaMandate.parentAssetId ? `Next step: ${alphaMandate.name}` : alphaMandate.name}</h3>
                          <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full border border-primary/40 text-primary bg-primary/10">ALPHA</span>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">
                          {alphaMandate.parentAssetId
                            ? (() => { const parent = assets.find(a => a.id === alphaMandate.parentAssetId); return parent ? `Step ${alphaMandate.stepOrder ?? '?'} of ${parent.name} · ${alphaMandate.targetHours}h` : `${alphaMandate.targetHours}h Mandate`; })()
                            : `${alphaMandate.targetHours}h Mandate`}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-2xl font-light tabular-nums tracking-tighter">
                            {alphaMandate.investedHours.toFixed(1)}
                            <span className="text-[8px] opacity-20 ml-1.5 uppercase tracking-[0.4em]">H</span>
                          </p>
                          <p className={cn(
                            "text-base font-light tabular-nums",
                            analytics?.status === 'critical' ? 'text-destructive' : 'text-primary gold-glow'
                          )}>{progress.toFixed(1)}%</p>
                        </div>
                        
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
                              analytics?.status === 'critical' ? 'bg-destructive' : 'bg-primary gold-glow shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                            )} 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>

                      {alphaMandate.parentAssetId && (() => {
                        const parent = assets.find(a => a.id === alphaMandate.parentAssetId);
                        if (!parent) return null;
                        const pathSteps = getChildrenOf(parent.id);
                        if (pathSteps.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                            {pathSteps.map((step) => {
                              const isCurrent = step.id === alphaMandate.id;
                              const isComplete = step.investedHours >= step.targetHours;
                              return (
                                <span
                                  key={step.id}
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-wider transition-all",
                                    isCurrent ? "bg-primary/20 text-primary border border-primary/40" : isComplete ? "bg-white/10 opacity-60" : "opacity-40"
                                  )}
                                >
                                  {isComplete ? '✓' : ''} Step {step.stepOrder ?? ''}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}

                      <div className="pt-1 flex justify-between items-center text-[7px] font-black uppercase tracking-[0.5em] opacity-30">
                        <span>Urgency: {(analytics?.urgencyFactor || 0).toFixed(2)}x</span>
                        <span>{analytics?.dailyRequired.toFixed(1)}h Required</span>
                      </div>
                    </div>

                    <Link href="/today" className="block">
                      <button className="w-full h-14 rounded-full bg-primary text-background text-[10px] font-black uppercase tracking-[0.8em] luxury-shadow hover:scale-[1.01] active:scale-95 transition-all duration-500 gold-glow">
                        Activate Alpha
                      </button>
                    </Link>
                  </div>
                )}

                {assets.filter(a => a.category === pillar.id && a.linkedCapitalAssetId).length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground px-2 flex items-center gap-2">
                      <Banknote size={12} /> Funding (Capital sub-goals)
                    </p>
                    {assets.filter(a => a.category === pillar.id && a.linkedCapitalAssetId).map((source) => {
                      const cap = assets.find(c => c.id === source.linkedCapitalAssetId);
                      if (!cap || (cap.targetType ?? 'hours') !== 'money') return null;
                      const pct = (cap.targetAmount ?? 0) > 0 ? Math.min(100, ((cap.investedAmount ?? 0) / (cap.targetAmount ?? 1)) * 100) : 0;
                      return (
                        <div key={source.id} className="luxury-blur p-5 rounded-[2rem] border border-white/5 luxury-shadow space-y-3">
                          <p className="text-[9px] opacity-60">Funding for: {source.name}</p>
                          <div className="flex justify-between items-center text-[9px] tabular-nums">
                            <span className="text-primary">{(cap.investedAmount ?? 0).toFixed(0)} € / {(cap.targetAmount ?? 0).toFixed(0)} €</span>
                            <span className="opacity-70">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            onClick={() => { setEntryModalAssetId(cap.id); setEntryAmount(''); setEntryNote(''); }}
                            className="w-full mt-2 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-background transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={12} /> Add entry
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={entryModalAssetId != null} onOpenChange={(open) => !open && setEntryModalAssetId(null)}>
        <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl luxury-text">Add entry</DialogTitle>
            <DialogDescription className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground">
              {entryModalAssetId ? assets.find(a => a.id === entryModalAssetId)?.name : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Amount (€)</Label>
              <Input
                type="number"
                value={entryAmount}
                placeholder="200"
                className="rounded-full h-12 bg-muted/50 border border-border dark:border-white/10 px-6"
                onChange={(e) => setEntryAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Note (optional)</Label>
              <Input
                value={entryNote}
                placeholder="e.g. monthly deposit"
                className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-6"
                onChange={(e) => setEntryNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setEntryModalAssetId(null); setEntryAmount(''); setEntryNote(''); }}
                className="flex-1 py-3 rounded-full border border-border dark:border-white/10 text-[10px] font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!entryAmount || !(parseFloat(entryAmount.replace(',', '.')) > 0)}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                Record
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-10" />
    </div>
  );
}
