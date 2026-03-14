
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useFoco } from '@/lib/store';
import { ChevronDown, Lock, Crown, Shield, Activity, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { PILLAR_CONFIG } from '@/lib/constants';

const BLOCK_SESSION_KEY = 'sovereign_block_session';

export default function PresenceAltar() {
  const { assets, lifeTracker, toggleFocus, intensityRequired, isCritical, assetAnalytics, isHydrated, setActiveAssetId, currentTime, getCriticalAsset, getSuggestedFocusAsset, getChildrenOf, getNextFocusBlock, currentBlockIndex, setCurrentBlockIndex } = useFoco();
  const { toast } = useToast();
  const [blockSession, setBlockSession] = useState<{ blockIndex: number; suggestedMinutes: number; totalBlocks: number } | null>(null);

  const isFocusing = lifeTracker.activeMode === 'focus';

  const criticalAsset = getCriticalAsset();
  const suggestedAsset = getSuggestedFocusAsset();
  const nextFocusBlock = getNextFocusBlock();
  const hoursOnlyAssets = useMemo(() => assets.filter(a => (a.targetType ?? 'hours') === 'hours'), [assets]);

  const activeAssetId = useMemo(() => {
    if (isFocusing) return lifeTracker.activeAssetId;
    if (isCritical && criticalAsset) return criticalAsset.id;
    const fallback =
      nextFocusBlock?.suggestedAssetId ??
      suggestedAsset?.id ??
      (hoursOnlyAssets.length > 0 ? hoursOnlyAssets[0].id : null);
    return lifeTracker.activeAssetId ?? fallback;
  }, [isFocusing, isCritical, criticalAsset, nextFocusBlock?.suggestedAssetId, suggestedAsset, hoursOnlyAssets, lifeTracker.activeAssetId]);

  useEffect(() => {
    if (!isHydrated || isFocusing) return;
    if (lifeTracker.activeAssetId) return;
    if (suggestedAsset?.id && hoursOnlyAssets.some(a => a.id === suggestedAsset.id)) {
      setActiveAssetId(suggestedAsset.id);
    }
  }, [isHydrated, isFocusing, lifeTracker.activeAssetId, suggestedAsset, hoursOnlyAssets, setActiveAssetId]);

  // Timer only when SEAL is off. In focus mode uses real clock so it keeps counting even with app minimized.
  const sessionDisplayTime = useMemo(() => {
    if (!isFocusing) return '00:00';
    const diff = Date.now() - lifeTracker.stateStartTime;
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [isFocusing, currentTime, lifeTracker.stateStartTime]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      const raw = sessionStorage.getItem(BLOCK_SESSION_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { blockIndex: number; suggestedAssetId: string; suggestedMinutes: number; totalBlocks: number };
      sessionStorage.removeItem(BLOCK_SESSION_KEY);
      if (data.suggestedAssetId && hoursOnlyAssets.some(a => a.id === data.suggestedAssetId)) {
        setActiveAssetId(data.suggestedAssetId);
      }
      setBlockSession({ blockIndex: data.blockIndex, suggestedMinutes: data.suggestedMinutes, totalBlocks: data.totalBlocks });
    } catch (_) {}
  }, [isHydrated, setActiveAssetId, hoursOnlyAssets]);

  const activeAsset = useMemo(() => assets.find(a => a.id === activeAssetId), [assets, activeAssetId]);
  const activeAnalytics = useMemo(() => activeAsset ? assetAnalytics(activeAsset.id) : null, [activeAsset, assetAnalytics]);

  const handleToggleFocus = () => {
    if (!isFocusing) {
      if (!activeAssetId) {
        toast({ title: "MANDATE REQUIRED", description: "Select a mandate to activate Presence.", variant: "elegant" });
        return;
      }
      // If user starts from Today (no preselected block), bind to the next focus block when it matches the selected mandate.
      if (!blockSession && currentBlockIndex === null && nextFocusBlock && !nextFocusBlock.blocked && nextFocusBlock.suggestedAssetId === activeAssetId) {
        setCurrentBlockIndex(nextFocusBlock.index, nextFocusBlock.minutes);
        setBlockSession({ blockIndex: nextFocusBlock.index, suggestedMinutes: nextFocusBlock.minutes, totalBlocks: nextFocusBlock.totalBlocks });
      }
      toggleFocus(activeAssetId);
    } else {
      toggleFocus();
      toast({ title: "MANDATE SEALED", description: "Your focus capital has been secured.", variant: "elegant" });
    }
  };

  if (!isHydrated) {
    return (
      <div className="page-content h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Presence Ritual...
        </p>
      </div>
    );
  }

  if (assets.length === 0 || hoursOnlyAssets.length === 0) {
    return (
      <div className="page-content h-[70vh] flex flex-col items-center justify-center text-center space-y-10 sm:space-y-14 animate-in fade-in duration-500">
        <header className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-20">Portfolio Void</p>
          <h1 className="text-5xl sm:text-6xl luxury-text">Empty.</h1>
        </header>
        {hoursOnlyAssets.length === 0 && assets.length > 0 && (
          <p className="text-[9px] opacity-50 max-w-xs">Add a focus (hours) mandate in the Vault to start Presence.</p>
        )}
        <Link href="/sanctuary/vault" className="w-full block">
          <button type="button" className="min-touch w-full h-16 sm:h-20 rounded-full bg-foreground text-background text-[11px] font-black uppercase tracking-[0.8em] transition-all luxury-shadow border border-white/5 active:scale-[0.98]">
            Forge Portfolio
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content space-y-8 sm:space-y-12 animate-in fade-in duration-500">
      <header className="text-center space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-50">Presence Ritual</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl luxury-text">Ignite.</h1>
          {blockSession && (
            <p className="text-[9px] font-black uppercase tracking-[0.6em] opacity-50">
              Block {blockSession.blockIndex + 1} of {blockSession.totalBlocks} · {blockSession.suggestedMinutes} min
            </p>
          )}
          {!blockSession && nextFocusBlock?.suggestedAssetName && (
            <p className="text-[9px] font-black uppercase tracking-[0.6em] opacity-35">
              Next block · {nextFocusBlock.suggestedAssetName} · {nextFocusBlock.minutes} min
            </p>
          )}
        </div>
        
        <div className="space-y-10">
          <div className="flex flex-col items-center">
            {isCritical && !isFocusing && (
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-destructive/80 mb-2">
                Pressure 100%+ — focus on the most urgent mandate only.
              </p>
            )}
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-[1em] mb-6 h-4 transition-all duration-1000",
              isCritical ? "text-destructive gold-glow" : "opacity-20"
            )}>
              {isFocusing ? activeAsset?.name : (isCritical ? 'Emergency Alpha' : 'Alpha Mandate')}
            </p>
            <div className={cn(
              "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter tabular-nums leading-none luxury-text transition-all duration-1000",
              isFocusing ? "text-primary gold-glow" : "opacity-10"
            )}>
              {sessionDisplayTime}
            </div>
          </div>

          {!isFocusing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(
                  "min-touch inline-flex items-center gap-4 px-6 py-4 rounded-full border border-white/10 luxury-blur text-[10px] font-bold uppercase tracking-[0.6em] transition-colors",
                  isCritical ? "border-destructive/40 text-destructive bg-destructive/5" : "opacity-70 hover:opacity-100 active:opacity-90"
                )}>
                  {isCritical && <Lock size={16} className="shrink-0 animate-pulse" />}
                  <span className="truncate max-w-[180px] sm:max-w-[220px]">{activeAsset?.name || 'Select Mandate'}</span>
                  {!isCritical && <ChevronDown size={16} className="shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              {!isCritical && (() => {
                const grouped = PILLAR_CONFIG.flatMap(pillar => {
                  const roots = hoursOnlyAssets.filter(a => a.category === pillar.id && !a.parentAssetId);
                  if (roots.length === 0) return [];
                  return [
                    { type: 'pillar' as const, id: pillar.id, label: pillar.label },
                    ...roots.flatMap(root => {
                      const children = getChildrenOf(root.id);
                      if (children.length === 0) return [{ type: 'item' as const, asset: root }];
                      return [
                        { type: 'goal' as const, id: root.id, name: root.name },
                        ...children.map(step => ({ type: 'item' as const, asset: step })),
                      ];
                    }),
                  ];
                });
                return (
                  <DropdownMenuContent align="center" className="rounded-[3rem] border-white/10 p-3 w-[min(100vw-2rem,340px)] max-w-[340px] luxury-blur luxury-shadow bg-card/95 backdrop-blur-3xl">
                    {grouped.map((entry) => {
                      if (entry.type === 'pillar') {
                        return (
                          <DropdownMenuLabel key={entry.id} className="text-[8px] uppercase tracking-wider opacity-50 py-2 px-4">
                            {entry.label}
                          </DropdownMenuLabel>
                        );
                      }
                      if (entry.type === 'goal') {
                        return (
                          <DropdownMenuLabel key={entry.id} className="text-[8px] uppercase tracking-wider opacity-70 py-1.5 pl-6 pr-4">
                            {entry.name}
                          </DropdownMenuLabel>
                        );
                      }
                      return (
                        <DropdownMenuItem
                          key={entry.asset.id}
                          onSelect={() => setActiveAssetId(entry.asset.id)}
                          className={cn(
                            "rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-colors",
                            entry.asset.parentAssetId && "pl-8"
                          )}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-widest">
                            {entry.asset.parentAssetId ? `Step ${entry.asset.stepOrder ?? ''}: ${entry.asset.name}` : entry.asset.name}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                );
              })()}
            </DropdownMenu>
          )}
        </div>
      </header>

      <section className="flex justify-center py-4 sm:py-6">
        <button
          type="button"
          onClick={handleToggleFocus}
          aria-label={isFocusing ? 'SEAL – end focus session' : 'IGNITE – start focus session'}
          className={cn(
            "min-touch w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-full flex flex-col items-center justify-center gap-3 sm:gap-6 transition-all duration-300 luxury-shadow relative group active:scale-[0.98]",
            isFocusing 
              ? "bg-primary/5 border-[1px] border-primary/50 shadow-[0_0_100px_rgba(212,175,55,0.2)] scale-110" 
              : "bg-foreground/5 border-[1px] border-white/10 hover:border-white/20 active:scale-95"
          )}
        >
          <div className={cn(
            "absolute inset-5 rounded-full border-[1.5px] border-dashed transition-all duration-1000",
            isFocusing ? "border-primary/50 animate-[spin_30s_linear_infinite]" : "border-foreground/5"
          )} />
          
          <div className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-1000 z-10",
            isFocusing 
              ? "border-primary text-primary shadow-[0_0_40px_rgba(212,175,55,0.5)] bg-primary/15" 
              : "border-white/20 text-white/30"
          )}>
            {isFocusing ? <Crown size={32} strokeWidth={1.5} /> : <Shield size={32} strokeWidth={1} />}
          </div>
          
          <div className="flex flex-col items-center gap-2 z-10">
            <span className={cn(
              "text-[12px] font-black uppercase tracking-[1.2em] transition-all duration-1000 ml-3",
              isFocusing ? "text-primary gold-glow" : "text-foreground/30"
            )}>
              {isFocusing ? 'SEAL' : 'IGNITE'}
            </span>
          </div>
        </button>
      </section>

      {isFocusing && activeAsset && activeAnalytics && (
        <section className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="luxury-card p-6 sm:p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={80} />
            </div>
            
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <Shield size={14} className="text-primary gold-glow" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Strategic Context HUD</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-primary">Active Impact</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 opacity-20">
                  <TrendingUp size={10} />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Urgency Factor</p>
                </div>
                <p className={cn(
                  "text-3xl font-light tabular-nums tracking-tighter",
                  activeAnalytics.urgencyFactor > 1.2 ? "text-destructive" : "text-primary gold-glow"
                )}>
                  {activeAnalytics.urgencyFactor.toFixed(2)}x
                </p>
                <p className="text-[7px] font-black uppercase opacity-10 tracking-[0.2em]">Legacy Pressure</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 opacity-20">
                  <Target size={10} />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Daily Mandate</p>
                </div>
                <p className="text-3xl font-light tabular-nums tracking-tighter">
                  {activeAnalytics.dailyRequired.toFixed(1)}
                  <span className="text-xs opacity-20 ml-1">H</span>
                </p>
                <p className="text-[7px] font-black uppercase opacity-10 tracking-[0.2em]">Required Yield</p>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-2">
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-20">
                <span>Legacy Debt Clearing</span>
                <span>{activeAnalytics.debtHours.toFixed(1)}H Owed</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary gold-glow transition-all duration-1000"
                  style={{ width: `${Math.min(100, (activeAsset.investedHours / activeAsset.targetHours) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}
      
      <div className="h-20" />
    </div>
  );
}
