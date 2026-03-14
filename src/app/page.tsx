
"use client"

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFoco } from '@/lib/store';
import { Zap, Clock, Compass, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmpireDashboard() {
  const router = useRouter();
  const { 
    assets,
    assetAnalytics,
    dailyStats, 
    dailyTargetHours, 
    intensityRequired,
    isCritical,
    netInvestableWindow,
    currentVitality,
    isHydrated,
    getSuggestedFocusAsset,
    getMissingCriticalRituals,
    ritualDefinitions,
    getNextFocusBlock,
    setCurrentBlockIndex,
  } = useFoco();

  const suggestedAsset = isHydrated ? getSuggestedFocusAsset() : null;
  const nextFocusBlock = isHydrated ? getNextFocusBlock() : null;
  const assetForNextBlock = nextFocusBlock?.suggestedAssetId ? assets.find((a) => a.id === nextFocusBlock.suggestedAssetId) ?? null : null;
  const missingRitualIdsForNextBlock = assetForNextBlock ? getMissingCriticalRituals(assetForNextBlock) : [];
  const missingRitualsForSuggested = suggestedAsset ? getMissingCriticalRituals(suggestedAsset) : [];
  const firstMissingRitualId = missingRitualsForSuggested[0] ?? null;
  const firstMissingRitual = firstMissingRitualId ? ritualDefinitions.find((r) => r.id === firstMissingRitualId) : null;

  const focusHoursToday = dailyStats.focus / 3600;
  const totalDebtHours = isHydrated && typeof assetAnalytics === 'function'
    ? assets.reduce((acc, a) => acc + assetAnalytics(a.id).debtHours, 0)
    : 0;

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] text-muted-foreground animate-pulse">
          Initializing Command...
        </p>
      </div>
    );
  }

  const handleStartNextBlock = () => {
    const b = nextFocusBlock;
    if (!b || b.blocked || !b.suggestedAssetId) {
      router.push('/today');
      return;
    }
    setCurrentBlockIndex(b.index, b.minutes);
    try {
      sessionStorage.setItem(
        "sovereign_block_session",
        JSON.stringify({
          blockIndex: b.index,
          suggestedAssetId: b.suggestedAssetId,
          suggestedMinutes: b.minutes,
          totalBlocks: b.totalBlocks,
        })
      );
    } catch (_) {}
    router.push('/today');
  };

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-10 animate-in fade-in duration-1000">
      <header className="space-y-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[1.2em] text-muted-foreground gold-glow">The Command</p>
        <h1 className="text-5xl luxury-text">Empire.</h1>
      </header>

      {assets.length === 0 && (
        <section className="luxury-blur p-8 rounded-[2.5rem] border border-border dark:border-white/15 text-center space-y-6" aria-label="Onboarding steps for new users">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-muted-foreground">Get started</p>
          <p className="text-sm font-light text-muted-foreground max-w-xs mx-auto">Two steps to start tracking focus and building your Empire.</p>
          <ol className="space-y-4 text-left max-w-sm mx-auto list-none">
            <li className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-border dark:border-white/10 bg-muted/30 dark:bg-white/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-black">1</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Create your first mandate</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Define a goal (hours or money) in the Vault.</p>
                <a href="/sanctuary/vault" className="inline-block mt-2 px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase tracking-wider hover:bg-primary hover:text-background transition-all">
                  Open Vault
                </a>
              </div>
            </li>
            <li className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.03]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-black">2</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Start a focus block</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">On Presence (Today), choose your mandate and log time.</p>
                <a href="/today" className="inline-block mt-2 px-4 py-2 rounded-full border border-border dark:border-white/20 text-[9px] font-bold uppercase tracking-wider hover:bg-muted transition-all">
                  Go to Presence
                </a>
              </div>
            </li>
          </ol>
        </section>
      )}

      <section className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.8em] text-muted-foreground">Temporal Equity Invested</p>
          <p className={cn(
            "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tighter tabular-nums leading-none luxury-text transition-all duration-1000",
            focusHoursToday > 0 ? "text-primary gold-glow" : "opacity-10"
          )}>
            {focusHoursToday.toFixed(1)}
            <span className="text-xs opacity-20 font-bold ml-2 uppercase tracking-[0.6em]">H</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 py-6 border-y border-foreground/5">
          <div className="space-y-1 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Mandate</p>
            <p className="text-lg font-light tabular-nums">{dailyTargetHours.toFixed(1)}h</p>
          </div>
          <div className="space-y-1 text-center border-x border-foreground/5">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Pressure</p>
            <p className={cn(
              "text-lg font-light tabular-nums",
              isCritical ? "text-destructive" : "text-primary/60"
            )}>{(intensityRequired * 100).toFixed(0)}%</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Integrity</p>
            <p className={cn(
              "text-lg font-light tabular-nums",
              currentVitality < 5 ? "text-destructive" : "text-primary/60"
            )}>{currentVitality}/10</p>
          </div>
        </div>
      </section>

      {/* Strategic Window - Agora no topo da hierarquia funcional */}
      <section className="luxury-blur p-6 rounded-[2.5rem] luxury-shadow flex justify-between items-center bg-black/20 border border-white/5 group hover:border-primary/20 transition-all duration-700">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 gold-glow group-hover:opacity-100 transition-opacity">Strategic Window</p>
          <p className="text-3xl font-light tabular-nums tracking-tight">
            {netInvestableWindow.toFixed(1)}
            <span className="text-xs opacity-20 font-bold ml-1.5 uppercase tracking-widest">H Remaining</span>
          </p>
          {totalDebtHours > 0 && (
            <p className="text-[8px] font-bold uppercase tracking-wider text-destructive/80 mt-1">
              Strategic debt: {totalDebtHours.toFixed(1)}h
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-1000",
          isCritical ? "bg-destructive/10 text-destructive shadow-[0_0_20px_rgba(255,0,0,0.15)] animate-pulse" : "bg-primary/5 text-primary/40"
        )}>
          {isCritical ? <Zap size={20} /> : <Clock size={20} />}
        </div>
      </section>

      {assets.length > 0 && nextFocusBlock?.suggestedAssetId && !nextFocusBlock.blocked && (
        <button type="button" onClick={handleStartNextBlock} className="block w-full text-left">
          <section className="luxury-blur p-6 rounded-[2.5rem] luxury-shadow bg-black/20 border border-white/5 group hover:border-primary/20 transition-all duration-700">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 gold-glow group-hover:opacity-100 transition-opacity">
                  Next focus block
                </p>
                <p className="text-lg font-light truncate">{nextFocusBlock.suggestedAssetName ?? 'Mandate'}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-60">
                  {nextFocusBlock.minutes} min · slot {nextFocusBlock.index + 1} of {nextFocusBlock.totalBlocks}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/30">
                <Activity size={18} />
              </div>
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-40 mt-3">Start in Presence</p>
          </section>
        </button>
      )}

      {missingRitualIdsForNextBlock.length > 0 && nextFocusBlock?.suggestedAssetId && (
        <Link href="/sanctuary" className="block">
          <section className="luxury-blur p-5 rounded-[2.5rem] luxury-shadow bg-black/20 border border-white/5 group hover:border-primary/20 transition-all duration-700">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 gold-glow group-hover:opacity-100 transition-opacity">Sustain your mandates</p>
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-1">For your next block · {nextFocusBlock.suggestedAssetName ?? 'Mandate'}</p>
            <ul className="mt-3 space-y-1.5">
              {missingRitualIdsForNextBlock.map((id) => {
                const ritual = ritualDefinitions.find((r) => r.id === id);
                const label = ritual?.label ?? id;
                return (
                  <li key={id} className="text-sm font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-40 mt-3">Open Altar</p>
          </section>
        </Link>
      )}

      {assets.length > 0 && (!nextFocusBlock?.suggestedAssetId || nextFocusBlock.blocked) && (
        <Link href="/today" className="block">
          <section className="luxury-blur p-6 rounded-[2.5rem] luxury-shadow bg-black/20 border border-white/5 group hover:border-primary/20 transition-all duration-700">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 gold-glow group-hover:opacity-100 transition-opacity">Presence</p>
                <p className="text-lg font-light">Start a focus block</p>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-60">Log time on your mandates</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/30">
                <Compass size={18} />
              </div>
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-40 mt-3">Go to Presence</p>
          </section>
        </Link>
      )}

      {firstMissingRitual && suggestedAsset && assets.length > 0 && (
        <Link href="/sanctuary" className="block">
          <section className="luxury-blur p-5 rounded-[2.5rem] luxury-shadow bg-black/20 border border-white/5 group hover:border-primary/20 transition-all duration-700">
            <div className="flex justify-between items-center gap-4">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 gold-glow group-hover:opacity-100 transition-opacity">Next ritual</p>
                <p className="text-base font-light truncate">{firstMissingRitual.label}</p>
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-40">Sustain your focus mandate</p>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/30">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-40 mt-2">Open Altar</p>
          </section>
        </Link>
      )}

      <div className="h-10" />
    </div>
  );
}
