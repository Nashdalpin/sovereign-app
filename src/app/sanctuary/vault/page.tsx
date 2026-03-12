"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFoco, Pillar, Priority } from '@/lib/store';
import { RITUAL_ICON_MAP } from '@/lib/ritual-icons';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase, Coins, Heart, User, Plus, Trash2, Gem, AlertTriangle, Zap, ArrowLeft, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PILLAR_CONFIG } from '@/lib/constants';

export default function SanctuaryVaultPage() {
  const { assets, addAsset, deleteAsset, updateAsset, isHydrated, assetAnalytics, updateAssetCriticalRituals, getDefaultCriticalRitualsForPillar, ritualDefinitions, updateAssetTasks } = useFoco();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<{ name: string; category: Pillar; priority: Priority; target: string; horizon: string }>({
    name: '', category: 'capital', priority: 'medium', target: '', horizon: '1'
  });

  const handleAdd = () => {
    if (!newAsset.name || !newAsset.target) return;
    addAsset(
      newAsset.name,
      newAsset.category,
      newAsset.priority,
      parseFloat(newAsset.target),
      parseInt(newAsset.horizon) as 1 | 5 | 10
    );
    setIsOpen(false);
    setNewAsset({ name: '', category: 'capital', priority: 'medium', target: '', horizon: '1' });
  };

  const viability = useMemo(() => {
    const hours = parseFloat(newAsset.target) || 0;
    const years = parseInt(newAsset.horizon) || 1;
    if (hours <= 0) return { daily: 0, status: 'none' as const };

    const daily = hours / (years * 365);
    let status: 'optimal' | 'demanding' | 'high' | 'impossible' = 'optimal';
    if (daily > 10) status = 'impossible';
    else if (daily > 5) status = 'high';
    else if (daily > 2) status = 'demanding';

    return { daily, status };
  }, [newAsset.target, newAsset.horizon]);

  type RefineSuggestion = {
    assetId: string;
    asset: typeof assets[0];
    type: 'extend_horizon' | 'reduce_target' | 'downgrade_priority';
    payload: { targetHours?: number; horizonYears?: 1 | 5 | 10; priority?: Priority };
    label: string;
  };
  const refineSuggestions = useMemo((): RefineSuggestion[] => {
    const reduceTarget: RefineSuggestion[] = [];
    const downgrade: RefineSuggestion[] = [];
    const extendHorizon: RefineSuggestion[] = [];
    for (const asset of assets) {
      const ana = assetAnalytics(asset.id);
      if (ana.status === 'critical') {
        const remaining = asset.targetHours - (asset.investedHours || 0);
        if (remaining > 0 && ana.urgencyFactor > 0) {
          const raw = asset.investedHours + remaining / ana.urgencyFactor;
          const suggestedTarget = Math.max(asset.investedHours + 1, Math.round(raw / 25) * 25);
          if (suggestedTarget < asset.targetHours) {
            reduceTarget.push({ assetId: asset.id, asset, type: 'reduce_target', payload: { targetHours: suggestedTarget }, label: `Reduce target to ${suggestedTarget}h` });
          }
        }
        if (asset.horizonYears === 1) {
          extendHorizon.push({ assetId: asset.id, asset, type: 'extend_horizon', payload: { horizonYears: 5 }, label: 'Extend horizon to 5Y (last resort)' });
        } else if (asset.horizonYears === 5) {
          extendHorizon.push({ assetId: asset.id, asset, type: 'extend_horizon', payload: { horizonYears: 10 }, label: 'Extend horizon to 10Y (last resort)' });
        }
      }
      if (asset.priority === 'high') {
        if (ana.dailyRequired > 10 || ana.dailyRequired > 5) {
          downgrade.push({ assetId: asset.id, asset, type: 'downgrade_priority', payload: { priority: 'medium' }, label: 'Downgrade to Beta (medium)' });
        }
      }
    }
    return [...reduceTarget, ...downgrade, ...extendHorizon];
  }, [assets, assetAnalytics]);

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Vault...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-12 animate-in fade-in duration-1000">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/sanctuary"
            className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-all"
          >
            <ArrowLeft size={12} />
            Back to Altar
          </Link>
          <Link
            href="/sanctuary/config"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border dark:border-white/15 bg-muted/30 dark:bg-white/[0.02] hover:bg-muted/50 dark:hover:bg-white/5 hover:border-primary/30 text-[8px] font-bold uppercase tracking-[0.4em] opacity-70 hover:opacity-100 transition-all"
          >
            <Settings size={12} strokeWidth={1.5} />
            Configure Altar
          </Link>
        </div>
        <div className="text-center space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-30 gold-glow">The Asset Vault</p>
          <h1 className="text-5xl luxury-text">Vault.</h1>
        </div>
      </header>

      {refineSuggestions.length > 0 && (
        <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-[10px] font-black uppercase tracking-[1em] opacity-30 flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            Refine Vault
          </h2>
          <div className="grid gap-4 px-2">
            {refineSuggestions.map((s) => (
              <div
                key={`${s.assetId}-${s.type}-${s.label}`}
                className="luxury-blur p-6 rounded-[2rem] border border-border dark:border-white/5 bg-muted/40 dark:bg-black/20 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{s.asset.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">{s.label}</p>
                </div>
                <button
                  onClick={() => updateAsset(s.assetId, s.payload)}
                  aria-label={`Apply suggestion: ${s.label}`}
                  className="px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider hover:bg-primary hover:text-background transition-all"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-12">
        <div className="flex justify-between items-center px-4">
          <p className="text-[10px] font-black uppercase tracking-[1em] opacity-15">Mandates Inventory</p>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button aria-label="Add new mandate" className="w-16 h-16 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-background transition-all border border-primary/20 flex items-center justify-center luxury-shadow gold-glow active:scale-90">
                <Plus size={24} />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-lg mx-auto overflow-y-auto max-h-[85dvh]">
              <DialogHeader className="text-center space-y-4 mb-6 sm:mb-8">
                <DialogTitle className="text-4xl luxury-text">Forge.</DialogTitle>
                <DialogDescription className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground">Establish New Strategic Mandate</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Mandate Identifier</Label>
                  <Input
                    value={newAsset.name}
                    placeholder="E.g., Quantum Growth"
                    className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 px-6 sm:px-8 text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Pillar</Label>
                    <Select value={newAsset.category} onValueChange={(v) => setNewAsset({ ...newAsset, category: v as Pillar })}>
                      <SelectTrigger className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 min-w-0 [&>span]:truncate px-4 sm:px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[2.5rem] luxury-blur border border-border dark:border-white/10 border-primary/10 bg-card">
                        {PILLAR_CONFIG.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Priority</Label>
                    <Select value={newAsset.priority} onValueChange={(v) => setNewAsset({ ...newAsset, priority: v as Priority })}>
                      <SelectTrigger className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 min-w-0 [&>span]:truncate px-4 sm:px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[2.5rem] luxury-blur border border-border dark:border-white/10 border-primary/10 bg-card">
                        <SelectItem value="high" className="text-destructive">Alpha</SelectItem>
                        <SelectItem value="medium" className="text-primary">Beta</SelectItem>
                        <SelectItem value="low">Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Target (Hours)</Label>
                    <Input
                      type="number" value={newAsset.target} placeholder="1000"
                      className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 px-6 sm:px-8 text-base placeholder:text-muted-foreground"
                      onChange={(e) => setNewAsset({ ...newAsset, target: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Horizon</Label>
                    <Select value={newAsset.horizon} onValueChange={(v) => setNewAsset({ ...newAsset, horizon: v })}>
                      <SelectTrigger className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 min-w-0 [&>span]:truncate px-4 sm:px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[2.5rem] luxury-blur border border-border dark:border-white/10 border-primary/10 bg-card">
                        <SelectItem value="1">1 Year</SelectItem>
                        <SelectItem value="5">5 Years</SelectItem>
                        <SelectItem value="10">10 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {viability.daily > 0 && (
                  <div className={cn(
                    "p-6 rounded-[2rem] border animate-in fade-in slide-in-from-top-4 duration-500",
                    viability.status === 'impossible' ? "bg-destructive/5 border-destructive/20" :
                    viability.status === 'high' ? "bg-amber-500/5 border-amber-500/20" :
                    "bg-primary/5 border-primary/20"
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                      {viability.status === 'impossible' ? <AlertTriangle className="text-destructive" size={16} /> : <Zap className="text-primary" size={16} />}
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Viability Audit</p>
                    </div>
                    <p className="text-2xl font-light tabular-nums leading-tight">
                      {viability.daily.toFixed(1)}h
                      <span className="text-[10px] ml-2 opacity-40 uppercase tracking-[0.2em]">Required Daily</span>
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-30 mt-2">
                      {viability.status === 'impossible' ? "TACTICAL FAILURE: PHYSICAL LIMIT REACHED" :
                       viability.status === 'high' ? "HIGH INTENSITY: REQUIRES TOTAL COMMITMENT" :
                       "OPTIMAL LOAD: SUSTAINABLE EXECUTION"}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={viability.status === 'impossible'}
                  className={cn(
                    "w-full h-20 mt-6 rounded-full text-[11px] font-black uppercase tracking-[1em] transition-all luxury-shadow gold-glow",
                    viability.status === 'impossible' ? "bg-muted/50 text-muted-foreground cursor-not-allowed dark:bg-white/5 dark:text-white/10" : "bg-foreground text-background hover:bg-primary active:scale-95"
                  )}
                >
                  Seal Mandate
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {PILLAR_CONFIG.map(pillar => {
          const pillarAssets = assets.filter(a => a.category === pillar.id);
          if (pillarAssets.length === 0) return null;

          return (
            <div key={pillar.id} className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
              <div className="flex items-center gap-4 px-4">
                <pillar.icon size={18} className="text-primary opacity-30" />
                <h2 className="text-2xl luxury-text">{pillar.label}</h2>
              </div>

              <div className="grid gap-6 px-2">
                {pillarAssets.map(asset => {
                  const ana = assetAnalytics(asset.id);
                  const progress = Math.min(100, (asset.investedHours / asset.targetHours) * 100);

                  return (
                    <div key={asset.id} className="luxury-blur p-8 rounded-[3rem] border border-border dark:border-white/5 luxury-shadow bg-muted/40 dark:bg-black/30 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-light">{asset.name}</p>
                            <span className={cn(
                              "text-[7px] font-black uppercase px-2.5 py-0.5 rounded-full border transition-all duration-500",
                              asset.priority === 'high' ? "border-destructive/40 text-destructive bg-destructive/5 shadow-[0_0_10px_rgba(255,0,0,0.1)]" :
                              asset.priority === 'medium' ? "border-primary/40 text-primary bg-primary/5" : "border-border dark:border-white/10 opacity-30"
                            )}>
                              {asset.priority === 'high' ? 'Alpha' : asset.priority === 'medium' ? 'Beta' : 'Gamma'}
                            </span>
                          </div>
                          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">
                            {ana.dailyRequired.toFixed(1)}h Daily / {asset.horizonYears}Y Horizon
                          </p>
                        </div>
                        <button onClick={() => deleteAsset(asset.id)} className="p-3 opacity-15 hover:opacity-100 transition-all text-destructive hover:scale-110">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] tabular-nums font-medium opacity-40">
                          <span>{asset.investedHours.toFixed(1)}h / {asset.targetHours}h Invested</span>
                          <span className="gold-glow">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000",
                              ana.status === 'critical' ? 'bg-destructive shadow-[0_0_10px_rgba(255,0,0,0.3)]' : 'bg-primary gold-glow shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {ana.debtHours > 5 && (
                        <div className="mt-4 pt-4 border-t border-border dark:border-white/5 flex items-center justify-between">
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                            <AlertTriangle size={10} /> Strategic Debt: {ana.debtHours.toFixed(1)}h
                          </p>
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-20">
                            Urgency: {ana.urgencyFactor.toFixed(2)}x
                          </p>
                        </div>
                      )}

                      <Collapsible defaultOpen={false} className="group">
                        <CollapsibleTrigger className="mt-4 pt-4 border-t border-border dark:border-white/5 w-full flex items-center justify-between text-left hover:opacity-90 transition-opacity">
                          <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50">
                            Critical rituals ({(asset.criticalRituals ?? getDefaultCriticalRitualsForPillar(asset.category)).length})
                          </span>
                          <ChevronDown size={12} className="opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="flex flex-wrap gap-2 pt-3">
                            {ritualDefinitions.map((ritual) => {
                              const IconComp = RITUAL_ICON_MAP[ritual.icon];
                              const effectiveRituals = asset.criticalRituals ?? getDefaultCriticalRitualsForPillar(asset.category);
                              const checked = effectiveRituals.includes(ritual.id);
                              return (
                                <label
                                  key={ritual.id}
                                  className={cn(
                                    "flex items-center gap-1.5 cursor-pointer rounded-full px-3 py-1.5 border transition-all",
                                    checked ? "border-primary/40 bg-primary/5" : "border-border dark:border-white/10 opacity-70 hover:opacity-100"
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => {
                                      const next = checked
                                        ? effectiveRituals.filter((r) => r !== ritual.id)
                                        : [...effectiveRituals, ritual.id];
                                      updateAssetCriticalRituals(asset.id, next);
                                    }}
                                    className="border-border dark:border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                  />
                                  {IconComp && <IconComp size={10} className="opacity-70 shrink-0" />}
                                  <span className="text-[8px] font-bold uppercase tracking-wider">{ritual.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="py-24 text-center opacity-30 dark:opacity-10 border border-dashed border-border dark:border-white/10 rounded-[3rem] flex flex-col items-center gap-6">
            <Gem size={40} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-[1em]">Portfolio Vault Empty</p>
          </div>
        )}
      </section>
      <div className="h-10" />
    </div>
  );
}
