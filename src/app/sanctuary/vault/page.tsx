"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFoco, Pillar, Priority } from '@/lib/store';
import { RITUAL_ICON_MAP } from '@/lib/ritual-icons';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase, Coins, Heart, User, Plus, Trash2, Gem, AlertTriangle, Zap, ArrowLeft, Settings, ChevronDown, ChevronUp, Banknote, GitBranch, Flag, Pencil, Check
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
  const { assets, addAsset, addAssetWithLinkedCapital, deleteAsset, updateAsset, isHydrated, assetAnalytics, updateAssetCriticalRituals, getDefaultCriticalRitualsForPillar, ritualDefinitions, updateAssetTasks, addGoalEntry, deleteGoalEntry, getGoalEntriesForAsset, getNextStepInPath, getChildrenOf, getNextStepOrderForParent, isAssetComplete, currentTime } = useFoco();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<{
    name: string; category: Pillar; priority: Priority; target: string; targetType: 'hours' | 'money' | 'hours_and_money';
    targetMoney: string; targetMoneyForLink: string; horizon: string; parentAssetId: string; stepOrder: string;
    targetWeight: string; currentWeight: string; targetUnit: string;
  }>({
    name: '', category: 'capital', priority: 'medium', target: '', targetType: 'hours', targetMoney: '', targetMoneyForLink: '', horizon: '1', parentAssetId: '', stepOrder: '1', targetWeight: '', currentWeight: '', targetUnit: ''
  });
  const [entryModalAssetId, setEntryModalAssetId] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; category: Pillar; priority: Priority; target: string; horizon: string; parentAssetId: string; stepOrder: string }>({ name: '', category: 'capital', priority: 'medium', target: '', horizon: '1', parentAssetId: '', stepOrder: '1' });
  const [appliedRefineKey, setAppliedRefineKey] = useState<string | null>(null);
  const [addStepParentId, setAddStepParentId] = useState<string | null>(null);
  const [addStepForm, setAddStepForm] = useState<{ name: string; target: string; horizon: string; priority: Priority }>({ name: '', target: '', horizon: '1', priority: 'medium' });

  const handleAdd = () => {
    const horizon = parseInt(newAsset.horizon, 10) as 1 | 5 | 10;
    const isCapital = newAsset.category === 'capital';
    const isMoneyOnly = (isCapital && newAsset.targetType === 'money') || (!isCapital && newAsset.targetType === 'money');
    const isHoursAndMoney = !isCapital && newAsset.targetType === 'hours_and_money';

    if (!newAsset.name) return;

    if (isHoursAndMoney) {
      const capitalAmount = parseFloat(newAsset.targetMoneyForLink);
      const targetHours = parseFloat(newAsset.target) || 0;
      if (!(capitalAmount > 0)) return;
      const pathOpts = newAsset.parentAssetId && newAsset.stepOrder ? { parentAssetId: newAsset.parentAssetId, stepOrder: parseInt(newAsset.stepOrder, 10) || 1 } : undefined;
      const weight = newAsset.category === 'vitality' && newAsset.targetWeight ? { targetWeight: parseFloat(newAsset.targetWeight), currentWeight: newAsset.currentWeight ? parseFloat(newAsset.currentWeight) : undefined, unit: newAsset.targetUnit || undefined } : undefined;
      addAssetWithLinkedCapital(newAsset.name, newAsset.category, newAsset.priority, targetHours, horizon, capitalAmount, pathOpts, weight);
      toast({ title: 'Goal created', description: 'Capital sub-goal created for funding.', variant: 'elegant' });
    } else if (isMoneyOnly) {
      const amount = parseFloat(newAsset.targetMoney);
      if (!(amount > 0)) return;
      addAsset(newAsset.name, newAsset.category, newAsset.priority, 0, horizon, { targetAmount: amount, currency: 'EUR' });
    } else {
      if (!newAsset.target) return;
      const pathOpts = newAsset.parentAssetId && newAsset.stepOrder ? { parentAssetId: newAsset.parentAssetId, stepOrder: parseInt(newAsset.stepOrder, 10) || 1 } : undefined;
      addAsset(newAsset.name, newAsset.category, newAsset.priority, parseFloat(newAsset.target), horizon, undefined, pathOpts);
    }
    setIsOpen(false);
    setNewAsset({ name: '', category: 'capital', priority: 'medium', target: '', targetType: 'hours', targetMoney: '', targetMoneyForLink: '', horizon: '1', parentAssetId: '', stepOrder: '1', targetWeight: '', currentWeight: '', targetUnit: '' });
  };

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

  const openEdit = (asset: typeof assets[0]) => {
    setEditAssetId(asset.id);
    const isMoney = (asset.targetType ?? 'hours') === 'money';
    setEditForm({
      name: asset.name,
      category: asset.category,
      priority: asset.priority,
      target: isMoney ? String(asset.targetAmount ?? '') : String(asset.targetHours ?? ''),
      horizon: String(asset.horizonYears),
      parentAssetId: asset.parentAssetId ?? '',
      stepOrder: String(asset.stepOrder ?? 1),
    });
  };

  const handleSaveEdit = () => {
    if (!editAssetId) return;
    const asset = assets.find(a => a.id === editAssetId);
    if (!asset) return;
    const isMoney = (asset.targetType ?? 'hours') === 'money';
    const horizon = parseInt(editForm.horizon, 10) as 1 | 5 | 10;
    if (!editForm.name.trim()) return;
    if (isMoney) {
      const amount = parseFloat(editForm.target);
      if (!(amount > 0)) return;
      updateAsset(editAssetId, { name: editForm.name.trim(), category: editForm.category, priority: editForm.priority, targetAmount: amount, horizonYears: horizon });
    } else {
      const targetHours = parseFloat(editForm.target);
      if (Number.isNaN(targetHours) || targetHours < 0) return;
      updateAsset(editAssetId, {
        name: editForm.name.trim(),
        category: editForm.category,
        priority: editForm.priority,
        targetHours,
        horizonYears: horizon,
        parentAssetId: editForm.parentAssetId || undefined,
        stepOrder: editForm.stepOrder ? parseInt(editForm.stepOrder, 10) : undefined,
      });
    }
    setEditAssetId(null);
    toast({ title: 'Mandate updated', variant: 'elegant' });
  };

  const handleAddStep = () => {
    if (!addStepParentId || !addStepForm.name.trim()) return;
    const parent = assets.find((a) => a.id === addStepParentId);
    if (!parent || (parent.targetType ?? 'hours') !== 'hours') return;
    const children = getChildrenOf(addStepParentId);
    const usedHours = children.reduce((sum, c) => sum + (c.targetHours ?? 0), 0);
    const remainingHours = Math.max(0, parent.targetHours - usedHours);
    const targetHours = parseFloat(addStepForm.target) || 0;
    if (targetHours <= 0) {
      toast({ title: 'Invalid hours', description: 'Enter a positive target for this step.', variant: 'destructive' });
      return;
    }
    if (targetHours > remainingHours) {
      toast({ title: 'Hours exceed goal', description: `This goal has ${remainingHours.toFixed(0)}h remaining. Reduce the step target or increase the goal's hours.`, variant: 'destructive' });
      return;
    }
    const horizon = parseInt(addStepForm.horizon, 10) as 1 | 5 | 10;
    const stepOrder = getNextStepOrderForParent(addStepParentId);
    addAsset(addStepForm.name.trim(), parent.category, addStepForm.priority, targetHours, horizon, undefined, { parentAssetId: addStepParentId, stepOrder });
    setAddStepParentId(null);
    setAddStepForm({ name: '', target: '', horizon: '1', priority: 'medium' });
    toast({ title: 'Step added', description: `"${addStepForm.name.trim()}" added to path.`, variant: 'elegant' });
  };

  const moveStep = (stepAssetId: string, direction: 'up' | 'down') => {
    const step = assets.find((a) => a.id === stepAssetId);
    if (!step?.parentAssetId) return;
    const siblings = getChildrenOf(step.parentAssetId);
    const idx = siblings.findIndex((a) => a.id === stepAssetId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    const orderA = step.stepOrder ?? idx + 1;
    const orderB = other.stepOrder ?? swapIdx + 1;
    updateAsset(step.id, { stepOrder: orderB });
    updateAsset(other.id, { stepOrder: orderA });
    toast({ title: 'Step reordered', variant: 'elegant' });
  };

  const viability = useMemo(() => {
    const years = parseInt(newAsset.horizon) || 1;
    const isMoney = (newAsset.category === 'capital' && newAsset.targetType === 'money') || (newAsset.category !== 'capital' && newAsset.targetType === 'money');
    const isHoursAndMoney = newAsset.category !== 'capital' && newAsset.targetType === 'hours_and_money';
    if (isMoney) {
      const amount = parseFloat(newAsset.targetMoney) || 0;
      if (amount <= 0) return { daily: 0, monthly: 0, status: 'none' as const };
      const monthly = amount / (years * 12);
      return { daily: 0, monthly, status: 'optimal' as const };
    }
    const hours = parseFloat(newAsset.target) || 0;
    if (hours <= 0 && !isHoursAndMoney) return { daily: 0, monthly: 0, status: 'none' as const };
    const daily = hours / (years * 365);
    let status: 'optimal' | 'demanding' | 'high' | 'impossible' = 'optimal';
    if (daily > 10) status = 'impossible';
    else if (daily > 5) status = 'high';
    else if (daily > 2) status = 'demanding';
    const linkAmount = isHoursAndMoney ? parseFloat(newAsset.targetMoneyForLink) || 0 : 0;
    const monthly = linkAmount > 0 ? linkAmount / (years * 12) : 0;
    return { daily, monthly, status };
  }, [newAsset.target, newAsset.targetMoney, newAsset.targetMoneyForLink, newAsset.targetType, newAsset.category, newAsset.horizon]);

  type RefineSuggestion = {
    assetId: string;
    asset: typeof assets[0];
    type: 'extend_horizon' | 'reduce_target' | 'downgrade_priority';
    payload: { targetHours?: number; horizonYears?: 1 | 5 | 10; priority?: Priority };
    label: string;
  };
  const SUSTAINABLE_DAILY_HOURS = 5;
  function getRefineSuggestionsForAsset(asset: typeof assets[0]): RefineSuggestion[] {
    if ((asset.targetType ?? 'hours') === 'money') return [];
    const ana = assetAnalytics(asset.id);
    const list: RefineSuggestion[] = [];

    const totalDays = asset.horizonYears * 365;
    const daysPassed = Math.max(0, Math.floor((currentTime - new Date(asset.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const behindOrCritical = (ana.status === 'critical' || (ana.status === 'behind' && ana.urgencyFactor > 1.25))
      && (daysPassed >= 7 || ana.debtHours > 5);
    const unsustainableFromStart = ana.dailyRequired > SUSTAINABLE_DAILY_HOURS;
    const showRefine = behindOrCritical || unsustainableFromStart;
    if (!showRefine) return list;

    const remaining = asset.targetHours - (asset.investedHours || 0);

    // 1st: Reduce target (adjust goal from metrics: invested hours + time → sustainable target)
    let reduceSuggested = false;
    if (remaining > 0 && ana.urgencyFactor > 0) {
      const raw = asset.investedHours + remaining / ana.urgencyFactor;
      const suggestedTarget = Math.max(asset.investedHours + 1, Math.round(raw / 25) * 25);
      const viable = suggestedTarget < asset.targetHours && suggestedTarget > asset.investedHours + 10;
      if (viable) {
        list.push({ assetId: asset.id, asset, type: 'reduce_target', payload: { targetHours: suggestedTarget }, label: `Reduce to ${suggestedTarget}h` });
        reduceSuggested = true;
      }
    }

    // 2nd: Downgrade (Beta + extend horizon when needed so years and hours/day change)
    if (asset.priority === 'high' && ana.dailyRequired > 5) {
      const extendHorizon = asset.horizonYears === 1 ? 5 : asset.horizonYears === 5 ? 10 : null;
      if (extendHorizon !== null) {
        list.push({
          assetId: asset.id,
          asset,
          type: 'downgrade_priority',
          payload: { priority: 'medium', horizonYears: extendHorizon as 5 | 10 },
          label: `Beta + ${extendHorizon}Y`,
        });
      } else {
        list.push({ assetId: asset.id, asset, type: 'downgrade_priority', payload: { priority: 'medium' }, label: 'Downgrade to Beta' });
      }
    }

    // 3rd: Extend years — last resort only when reduce wasn't viable or debt is very high; skip if we already offer same horizon via Beta + X Y
    const extendAsLastResort = !reduceSuggested || ana.debtHours > 30;
    const alreadyExtendViaDowngrade = list.some((s) => s.type === 'downgrade_priority' && s.payload.horizonYears != null);
    if (extendAsLastResort && !alreadyExtendViaDowngrade) {
      const horizon = asset.horizonYears === 1 ? 5 : asset.horizonYears === 5 ? 10 : null;
      if (horizon !== null) {
        list.push({ assetId: asset.id, asset, type: 'extend_horizon', payload: { horizonYears: horizon as 5 | 10 }, label: `Extend to ${horizon}Y (last)` });
      }
    }

    return list;
  }

  const handleApplyRefine = (s: RefineSuggestion) => {
    const key = `${s.assetId}-${s.type}`;
    updateAsset(s.assetId, s.payload);
    setAppliedRefineKey(key);
    window.setTimeout(() => setAppliedRefineKey(null), 2000);
  };

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] text-muted-foreground animate-pulse">
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

      <section className="space-y-12">
        <div className="flex justify-between items-center px-4">
          <p className="text-[10px] font-black uppercase tracking-[1em] text-muted-foreground">Mandates Inventory</p>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button aria-label="Add new mandate" className="w-16 h-16 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-background transition-all border border-primary/20 flex items-center justify-center luxury-shadow gold-glow active:scale-90">
                <Plus size={24} />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-lg mx-auto overflow-y-auto max-h-[85dvh]">
              <DialogTitle className="text-4xl luxury-text text-center">Forge.</DialogTitle>
              <DialogHeader className="text-center space-y-4 mb-6 sm:mb-8">
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

                {(newAsset.category === 'capital' || newAsset.category === 'vitality' || newAsset.category === 'professional' || newAsset.category === 'personal') && (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Goal type</Label>
                    <div
                      role="group"
                      aria-label="Goal type"
                      className="flex rounded-[2rem] p-1.5 bg-muted/30 dark:bg-white/5 border border-border dark:border-white/10 luxury-blur overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setNewAsset({ ...newAsset, targetType: 'hours' })}
                        aria-pressed={newAsset.targetType === 'hours' || (newAsset.category === 'capital' && newAsset.targetType === 'hours_and_money')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 min-h-12 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300",
                          (newAsset.targetType === 'hours' || (newAsset.category === 'capital' && newAsset.targetType === 'hours_and_money'))
                            ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <Zap size={14} strokeWidth={2} className="shrink-0" />
                        <span>Hours</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAsset({ ...newAsset, targetType: 'money' })}
                        aria-pressed={newAsset.targetType === 'money'}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 min-h-12 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300",
                          newAsset.targetType === 'money'
                            ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <Banknote size={14} strokeWidth={2} className="shrink-0" />
                        <span>Money</span>
                      </button>
                      {newAsset.category !== 'capital' && (
                        <button
                          type="button"
                          onClick={() => setNewAsset({ ...newAsset, targetType: 'hours_and_money' })}
                          aria-pressed={newAsset.targetType === 'hours_and_money'}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 min-h-12 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300",
                            newAsset.targetType === 'hours_and_money'
                              ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                          )}
                        >
                          <Zap size={12} strokeWidth={2} className="shrink-0" />
                          <span className="opacity-70">+</span>
                          <Banknote size={12} strokeWidth={2} className="shrink-0" />
                          <span className="truncate">Hours + €</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(newAsset.category === 'capital' && newAsset.targetType === 'money') || (newAsset.category !== 'capital' && newAsset.targetType === 'money') ? (
                    <div className="space-y-2 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Target (€)</Label>
                      <Input
                        type="number" value={newAsset.targetMoney} placeholder="5000"
                        className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 px-6 sm:px-8 text-base placeholder:text-muted-foreground"
                        onChange={(e) => setNewAsset({ ...newAsset, targetMoney: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground truncate block">Target (Hours)</Label>
                      <Input
                        type="number" value={newAsset.target} placeholder="1000"
                        className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 px-6 sm:px-8 text-base placeholder:text-muted-foreground"
                        onChange={(e) => setNewAsset({ ...newAsset, target: e.target.value })}
                      />
                    </div>
                  )}
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

                {newAsset.category !== 'capital' && newAsset.targetType === 'hours_and_money' && (
                  <div className="flex items-center gap-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground shrink-0">Amount (€)</Label>
                    <Input
                      type="number" value={newAsset.targetMoneyForLink} placeholder="1500"
                      className="rounded-full h-11 flex-1 bg-muted/50 border border-border dark:border-white/10 px-4 text-sm"
                      onChange={(e) => setNewAsset({ ...newAsset, targetMoneyForLink: e.target.value })}
                    />
                  </div>
                )}

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
                      {viability.daily > 0 ? `${viability.daily.toFixed(1)}h` : `${viability.monthly.toFixed(0)} €`}
                      <span className="text-[10px] ml-2 opacity-40 uppercase tracking-[0.2em]">{viability.daily > 0 ? 'Required Daily' : 'per month (avg)'}</span>
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-30 mt-2">
                      {viability.status === 'impossible' ? "TACTICAL FAILURE: PHYSICAL LIMIT REACHED" :
                       viability.status === 'high' ? "HIGH INTENSITY: REQUIRES TOTAL COMMITMENT" :
                       "OPTIMAL LOAD: SUSTAINABLE EXECUTION"}
                    </p>
                  </div>
                )}

                {viability.monthly > 0 && viability.daily === 0 && (
                  <div className="p-6 rounded-[2rem] border bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Banknote className="text-primary" size={16} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Suggested savings</p>
                    </div>
                    <p className="text-2xl font-light tabular-nums leading-tight">
                      {viability.monthly.toFixed(0)} €
                      <span className="text-[10px] ml-2 opacity-40 uppercase tracking-[0.2em]">per month</span>
                    </p>
                  </div>
                )}

                {(newAsset.targetType === 'hours' || newAsset.targetType === 'hours_and_money') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground block truncate">
                        <span className="inline-flex items-center gap-1.5"><GitBranch size={10} /> Parent goal</span>
                      </Label>
                      <Select value={newAsset.parentAssetId || 'none'} onValueChange={(v) => setNewAsset({ ...newAsset, parentAssetId: v === 'none' ? '' : v })}>
                        <SelectTrigger className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 w-full min-w-0 max-w-full [&>span]:truncate px-4 sm:px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                          <SelectValue placeholder="Long-term goal (optional)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[2.5rem] luxury-blur border border-border dark:border-white/10 border-primary/10 bg-card max-w-[min(90vw,theme(screens.sm))]">
                          <SelectItem value="none" className="truncate">None (root goal)</SelectItem>
                          {assets.filter(a => a.category === newAsset.category && !a.parentAssetId && (a.targetType ?? 'hours') === 'hours').map(a => (
                            <SelectItem key={a.id} value={a.id} className="truncate">{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-1.5">
                        <Flag size={10} /> Step order
                      </Label>
                      <Input
                        type="number" min={1} value={newAsset.stepOrder} placeholder="1"
                        className="rounded-full h-12 sm:h-14 bg-muted/50 border border-border dark:border-white/10 px-6 w-full"
                        onChange={(e) => setNewAsset({ ...newAsset, stepOrder: e.target.value || '1' })}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={
                    viability.status === 'impossible'
                    || (newAsset.category === 'capital' && newAsset.targetType === 'money' && !(parseFloat(newAsset.targetMoney) > 0))
                    || (newAsset.category !== 'capital' && newAsset.targetType === 'money' && !(parseFloat(newAsset.targetMoney) > 0))
                    || (newAsset.targetType === 'hours_and_money' && !(parseFloat(newAsset.targetMoneyForLink) > 0))
                  }
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

          const hoursRoots = pillarAssets.filter(a => !a.parentAssetId && (a.targetType ?? 'hours') === 'hours');
          const moneyAssets = pillarAssets.filter(a => (a.targetType ?? 'hours') === 'money');
          const groups: { root: typeof assets[0]; children: typeof assets }[] = [
            ...hoursRoots.map(root => ({ root, children: getChildrenOf(root.id) })),
            ...moneyAssets.map(root => ({ root, children: [] as typeof assets })),
          ].sort((a, b) => a.root.name.localeCompare(b.root.name));

          return (
            <div key={pillar.id} className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
              <div className="flex items-center gap-4 px-4">
                <pillar.icon size={18} className="text-primary opacity-30" />
                <h2 className="text-2xl luxury-text">{pillar.label}</h2>
              </div>

              <div className="grid gap-6 px-2">
                {groups.map(({ root: asset, children }) => {
                  const isMoney = (asset.targetType ?? 'hours') === 'money';
                  const ana = assetAnalytics(asset.id);
                  const progress = isMoney
                    ? (asset.targetAmount && asset.targetAmount > 0 ? Math.min(100, ((asset.investedAmount ?? 0) / asset.targetAmount) * 100) : 0)
                    : Math.min(100, (asset.targetHours > 0 ? (asset.investedHours / asset.targetHours) * 100 : 0));
                  const entries = getGoalEntriesForAsset(asset.id);
                  const isNextStep = !isMoney && getNextStepInPath(pillar.id)?.id === asset.id;

                  return (
                    <div key={asset.id} className="luxury-blur p-8 rounded-[3rem] border border-border dark:border-white/5 luxury-shadow bg-muted/40 dark:bg-black/30 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-lg font-light">{asset.name}</p>
                            {isNextStep && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">Next step</span>}
                            {isMoney && <span className="text-[8px] font-black uppercase text-primary opacity-70 flex items-center gap-1"><Banknote size={10} /> €</span>}
                            <span className={cn(
                              "text-[7px] font-black uppercase px-2.5 py-0.5 rounded-full border transition-all duration-500",
                              asset.priority === 'high' ? "border-destructive/40 text-destructive bg-destructive/5 shadow-[0_0_10px_rgba(255,0,0,0.1)]" :
                              asset.priority === 'medium' ? "border-primary/40 text-primary bg-primary/5" : "border-border dark:border-white/10 opacity-30"
                            )}>
                              {asset.priority === 'high' ? 'Alpha' : asset.priority === 'medium' ? 'Beta' : 'Gamma'}
                            </span>
                          </div>
                          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">
                            {isMoney
                              ? `${asset.horizonYears}Y Horizon · Avg ${asset.targetAmount ? (asset.targetAmount / (asset.horizonYears * 12)).toFixed(0) : 0} €/mo`
                              : `${ana.dailyRequired.toFixed(1)}h Daily / ${asset.horizonYears}Y Horizon`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isMoney && (
                            <button
                              onClick={() => { setAddStepParentId(asset.id); setAddStepForm({ name: '', target: '', horizon: String(asset.horizonYears), priority: asset.priority }); }}
                              className="p-3 opacity-40 hover:opacity-100 transition-all hover:scale-110 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider"
                              aria-label={`Add step to ${asset.name}`}
                            >
                              <Plus size={12} /> Add step
                            </button>
                          )}
                          <button onClick={() => openEdit(asset)} className="p-3 opacity-40 hover:opacity-100 transition-all hover:scale-110" aria-label={`Edit ${asset.name}`}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteAsset(asset.id)} className="p-3 opacity-15 hover:opacity-100 transition-all text-destructive hover:scale-110" aria-label={`Delete ${asset.name}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] tabular-nums font-medium opacity-40">
                          {isMoney ? (
                            <span>{(asset.investedAmount ?? 0).toFixed(0)} € / {(asset.targetAmount ?? 0).toFixed(0)} €</span>
                          ) : (
                            <span>{asset.investedHours.toFixed(1)}h / {asset.targetHours}h Invested</span>
                          )}
                          <span className="gold-glow">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000",
                              !isMoney && ana.status === 'critical' ? 'bg-destructive shadow-[0_0_10px_rgba(255,0,0,0.3)]' : 'bg-primary gold-glow shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {!isMoney && children.length > 0 && (() => {
                        const usedHours = children.reduce((s, c) => s + (c.targetHours ?? 0), 0);
                        const remainingHours = Math.max(0, asset.targetHours - usedHours);
                        return (
                          <div className="mt-4 pt-4 border-t border-border dark:border-white/5">
                            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50 mb-3 flex items-center gap-1.5">
                              <Flag size={10} /> Path · {usedHours.toFixed(0)}h allocated · {remainingHours.toFixed(0)}h remaining
                            </p>
                            <div className="space-y-2">
                              {children.map((step) => {
                                const stepAna = assetAnalytics(step.id);
                                const stepProgress = step.targetHours > 0 ? Math.min(100, (step.investedHours / step.targetHours) * 100) : 0;
                                const stepIsNext = getNextStepInPath(pillar.id)?.id === step.id;
                                return (
                                  <div key={step.id} className="rounded-[2rem] border-l-2 border-l-primary/20 bg-muted/30 dark:bg-white/5 p-4 sm:p-5 transition-all">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <span className="text-[8px] font-black uppercase opacity-60 shrink-0">Step {step.stepOrder ?? '?'}</span>
                                        <p className="text-sm font-light truncate">{step.name}</p>
                                        {stepIsNext && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 shrink-0">Next</span>}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => moveStep(step.id, 'up')} className="p-2 opacity-40 hover:opacity-100 transition-all" aria-label="Move step up"><ChevronUp size={12} /></button>
                                        <button onClick={() => moveStep(step.id, 'down')} className="p-2 opacity-40 hover:opacity-100 transition-all" aria-label="Move step down"><ChevronDown size={12} /></button>
                                        <button onClick={() => openEdit(step)} className="p-2 opacity-40 hover:opacity-100 transition-all" aria-label={`Edit ${step.name}`}><Pencil size={12} /></button>
                                        <button onClick={() => deleteAsset(step.id)} className="p-2 opacity-15 hover:opacity-100 transition-all text-destructive" aria-label={`Delete ${step.name}`}><Trash2 size={12} /></button>
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-[9px] tabular-nums font-medium opacity-60 mt-2">
                                      <span>{step.investedHours.toFixed(1)}h / {step.targetHours}h</span>
                                      <span className="gold-glow">{stepProgress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-foreground/5 rounded-full overflow-hidden mt-1.5">
                                      <div className={cn("h-full transition-all duration-1000", stepAna.status === 'critical' ? 'bg-destructive' : 'bg-primary gold-glow')} style={{ width: `${stepProgress}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {!isMoney && ana.debtHours > 5 && (
                        <div className="mt-4 pt-4 border-t border-border dark:border-white/5 flex items-center justify-between">
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                            <AlertTriangle size={10} /> Strategic Debt: {ana.debtHours.toFixed(1)}h
                          </p>
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-20">
                            Urgency: {ana.urgencyFactor.toFixed(2)}x
                          </p>
                        </div>
                      )}

                      {!isMoney && (() => {
                        const refineSuggestions = getRefineSuggestionsForAsset(asset);
                        if (refineSuggestions.length === 0) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-border dark:border-white/5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[7px] font-black uppercase tracking-wider opacity-40 mr-0.5">Refine</span>
                            {refineSuggestions.map((s) => {
                              const key = `${s.assetId}-${s.type}`;
                              const justApplied = appliedRefineKey === key;
                              const extendHint = s.type === 'reduce_target'
                                ? 'Adjust goal to sustainable level based on invested hours and time (first option).'
                                : s.type === 'extend_horizon'
                                  ? (s.label.includes('(last)') ? 'Last resort: extend timeline when reducing the goal isn\'t viable. Same goal, more time → fewer hours/day.' : 'Extend timeline → fewer hours per day (same goal, more time).')
                                  : s.type === 'downgrade_priority' && s.payload.horizonYears
                                    ? 'Lower priority to Beta and extend timeline → years and hours/day update.'
                                    : s.type === 'downgrade_priority'
                                      ? 'Only changes priority (Alpha→Beta).'
                                      : undefined;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => !justApplied && handleApplyRefine(s)}
                                  disabled={justApplied}
                                  title={extendHint}
                                  aria-label={justApplied ? 'Applied' : `Apply: ${s.label}`}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-bold uppercase tracking-wider transition-all",
                                    justApplied
                                      ? "border border-primary/50 bg-primary/10 text-primary"
                                      : "border border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-background"
                                  )}
                                >
                                  {justApplied ? <Check size={10} strokeWidth={2.5} /> : null}
                                  <span>{justApplied ? 'Ok' : s.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {isMoney && (
                        <div className="mt-4 pt-4 border-t border-border dark:border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50">Entries ({entries.length})</span>
                            <button
                              onClick={() => { setEntryModalAssetId(asset.id); setEntryAmount(''); setEntryNote(''); }}
                              className="text-[8px] font-bold uppercase tracking-wider text-primary hover:underline"
                            >
                              + Add entry
                            </button>
                          </div>
                          {entries.length > 0 && (
                            <ul className="space-y-2 max-h-32 overflow-y-auto">
                              {entries.map((e) => (
                                <li key={e.id} className="flex items-center justify-between text-[10px] py-1.5 px-3 rounded-full bg-muted/30 dark:bg-white/5">
                                  <span className="tabular-nums">{e.amount.toFixed(0)} €</span>
                                  <span className="opacity-50">{new Date(e.timestamp).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                                  <button onClick={() => deleteGoalEntry(e.id)} className="p-1 opacity-40 hover:opacity-100 text-destructive" aria-label="Remove entry"><Trash2 size={10} /></button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {!isMoney && (
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="py-24 text-center border border-dashed border-border dark:border-white/10 rounded-[3rem] flex flex-col items-center gap-6">
            <Gem size={40} strokeWidth={1} className="text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-[1em] text-muted-foreground">
              Portfolio Vault Empty
            </p>
          </div>
        )}
      </section>

      <Dialog open={addStepParentId != null} onOpenChange={(open) => !open && (setAddStepParentId(null), setAddStepForm({ name: '', target: '', horizon: '1', priority: 'medium' }))}>
        <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-md mx-auto">
          <DialogTitle className="text-xl luxury-text">Add step</DialogTitle>
          <DialogHeader>
            <DialogDescription className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground">
              {addStepParentId ? assets.find(a => a.id === addStepParentId)?.name : ''}
            </DialogDescription>
          </DialogHeader>
          {addStepParentId && (() => {
            const parent = assets.find(a => a.id === addStepParentId);
            if (!parent) return null;
            const children = getChildrenOf(addStepParentId);
            const usedHours = children.reduce((s, c) => s + (c.targetHours ?? 0), 0);
            const remainingHours = Math.max(0, parent.targetHours - usedHours);
            const nextOrder = getNextStepOrderForParent(addStepParentId);
            return (
              <div className="space-y-4 pt-2">
                <div className="rounded-full px-4 py-2 bg-muted/50 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Step {nextOrder} · Up to {remainingHours.toFixed(0)}h remaining in this goal
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Step name</Label>
                  <Input value={addStepForm.name} onChange={(e) => setAddStepForm(f => ({ ...f, name: e.target.value }))} className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4" placeholder="e.g. Research phase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Target (hours)</Label>
                  <Input type="number" min={0} step={1} value={addStepForm.target} onChange={(e) => setAddStepForm(f => ({ ...f, target: e.target.value }))} className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4" placeholder={remainingHours.toFixed(0)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Horizon</Label>
                    <Select value={addStepForm.horizon} onValueChange={(v) => setAddStepForm(f => ({ ...f, horizon: v }))}>
                      <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                        <SelectItem value="1">1 Year</SelectItem>
                        <SelectItem value="5">5 Years</SelectItem>
                        <SelectItem value="10">10 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Priority</Label>
                    <Select value={addStepForm.priority} onValueChange={(v) => setAddStepForm(f => ({ ...f, priority: v as Priority }))}>
                      <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                        <SelectItem value="high">Alpha</SelectItem>
                        <SelectItem value="medium">Beta</SelectItem>
                        <SelectItem value="low">Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setAddStepParentId(null); setAddStepForm({ name: '', target: '', horizon: '1', priority: 'medium' }); }} className="flex-1 py-3 rounded-full border border-border dark:border-white/10 text-[10px] font-bold uppercase tracking-wider">Cancel</button>
                  <button onClick={handleAddStep} disabled={!addStepForm.name.trim() || !(parseFloat(addStepForm.target) > 0)} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">Add step</button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={entryModalAssetId != null} onOpenChange={(open) => !open && setEntryModalAssetId(null)}>
        <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-md mx-auto">
          <DialogTitle className="text-xl luxury-text">Add entry</DialogTitle>
          <DialogHeader>
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

      <Dialog open={editAssetId != null} onOpenChange={(open) => !open && setEditAssetId(null)}>
        <DialogContent className="rounded-[3rem] border border-primary/20 luxury-blur p-6 sm:p-8 bg-card/95 backdrop-blur-3xl max-w-[94vw] sm:max-w-md mx-auto">
          <DialogTitle className="text-xl luxury-text">Edit mandate</DialogTitle>
          <DialogHeader>
            <DialogDescription className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground">
              {editAssetId ? assets.find(a => a.id === editAssetId)?.name : ''}
            </DialogDescription>
          </DialogHeader>
          {editAssetId && (() => {
            const asset = assets.find(a => a.id === editAssetId);
            const isMoney = asset && (asset.targetType ?? 'hours') === 'money';
            return (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4" placeholder="Mandate name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Pillar</Label>
                    <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v as Pillar }))}>
                      <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                        {PILLAR_CONFIG.map(p => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Priority</Label>
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm(f => ({ ...f, priority: v as Priority }))}>
                      <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                        <SelectItem value="high">Alpha</SelectItem>
                        <SelectItem value="medium">Beta</SelectItem>
                        <SelectItem value="low">Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">{isMoney ? 'Target (€)' : 'Target (hours)'}</Label>
                  <Input type="number" value={editForm.target} onChange={(e) => setEditForm(f => ({ ...f, target: e.target.value }))} className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4" placeholder={isMoney ? '5000' : '1000'} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Horizon</Label>
                  <Select value={editForm.horizon} onValueChange={(v) => setEditForm(f => ({ ...f, horizon: v }))}>
                    <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                      <SelectItem value="1">1 Year</SelectItem>
                      <SelectItem value="5">5 Years</SelectItem>
                      <SelectItem value="10">10 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isMoney && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Parent goal</Label>
                      <Select value={editForm.parentAssetId || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, parentAssetId: v === 'none' ? '' : v }))}>
                        <SelectTrigger className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4 text-[10px]">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border dark:border-white/10 bg-card">
                          <SelectItem value="none">None</SelectItem>
                          {assets.filter(a => a.category === editForm.category && !a.parentAssetId && a.id !== editAssetId && (a.targetType ?? 'hours') === 'hours').map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Step order</Label>
                      <Input type="number" min={1} value={editForm.stepOrder} onChange={(e) => setEditForm(f => ({ ...f, stepOrder: e.target.value || '1' }))} className="rounded-full h-11 bg-muted/50 border border-border dark:border-white/10 px-4" />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditAssetId(null)} className="flex-1 py-3 rounded-full border border-border dark:border-white/10 text-[10px] font-bold uppercase tracking-wider">Cancel</button>
                  <button onClick={handleSaveEdit} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider hover:opacity-90">Save</button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <div className="h-10" />
    </div>
  );
}
