
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useFoco } from '@/lib/store';
import { ChevronDown, Lock, Crown, Shield, Activity, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const BLOCK_SESSION_KEY = 'sovereign_block_session';

export default function PresenceAltar() {
  const { assets, lifeTracker, toggleFocus, intensityRequired, isCritical, assetAnalytics, isHydrated, setActiveAssetId, currentTime, getCriticalAsset } = useFoco();
  const { toast } = useToast();
  const [blockSession, setBlockSession] = useState<{ blockIndex: number; suggestedMinutes: number; totalBlocks: number } | null>(null);

  const isFocusing = lifeTracker.activeMode === 'focus';

  const criticalAsset = getCriticalAsset();
  const hoursOnlyAssets = useMemo(() => assets.filter(a => (a.targetType ?? 'hours') === 'hours'), [assets]);

  const activeAssetId = useMemo(() => {
    if (isFocusing) return lifeTracker.activeAssetId;
    if (isCritical && criticalAsset) return criticalAsset.id;
    const fallback = hoursOnlyAssets.length > 0 ? hoursOnlyAssets[0].id : null;
    return lifeTracker.activeAssetId || (criticalAsset ? criticalAsset.id : fallback);
  }, [isFocusing, isCritical, criticalAsset, hoursOnlyAssets, lifeTracker.activeAssetId]);

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
      toggleFocus(activeAssetId);
    } else {
      toggleFocus();
      toast({ title: "MANDATE SEALED", description: "Your focus capital has been secured.", variant: "elegant" });
    }
  };

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Presence Ritual...
        </p>
      </div>
    );
  }

  if (assets.length === 0 || hoursOnlyAssets.length === 0) {
    return (
      <div className="max-w-screen-sm mx-auto h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center space-y-12 sm:space-y-16 animate-in fade-in duration-1000">
        <header className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-20">Portfolio Void</p>
          <h1 className="text-5xl sm:text-6xl luxury-text">Empty.</h1>
        </header>
        {hoursOnlyAssets.length === 0 && assets.length > 0 && (
          <p className="text-[9px] opacity-50 max-w-xs">Add a focus (hours) mandate in the Vault to start Presence.</p>
        )}
        <Link href="/sanctuary/vault" className="w-full">
          <button className="w-full h-24 rounded-full bg-foreground text-background text-[11px] font-black uppercase tracking-[1em] transition-all luxury-shadow border border-white/5">
            Forge Portfolio
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-10 sm:space-y-16 animate-in fade-in duration-1000">
      <header className="text-center space-y-8 sm:space-y-10">
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[1.5em] opacity-20 gold-glow">Presence Ritual</p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl luxury-text">Ignite.</h1>
          {blockSession && (
            <p className="text-[9px] font-black uppercase tracking-[0.6em] opacity-50">
              Block {blockSession.blockIndex + 1} of {blockSession.totalBlocks} · {blockSession.suggestedMinutes} min
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
                <button className={cn(
                  "inline-flex items-center gap-6 px-12 py-6 rounded-full border border-white/10 luxury-blur text-[10px] font-bold uppercase tracking-[0.8em] transition-all",
                  isCritical ? "border-destructive/40 text-destructive bg-destructive/5" : "opacity-40 hover:opacity-100"
                )}>
                  {isCritical && <Lock size={14} className="mr-2 animate-pulse" />}
                  {activeAsset?.name || 'Select Mandate'} 
                  {!isCritical && <ChevronDown size={14} />}
                </button>
              </DropdownMenuTrigger>
              {!isCritical && (
                <DropdownMenuContent align="center" className="rounded-[3rem] border-white/10 p-3 w-[min(100vw-2rem,320px)] max-w-[320px] luxury-blur luxury-shadow bg-card/95 backdrop-blur-3xl">
                  {hoursOnlyAssets.map(asset => (
                    <DropdownMenuItem 
                      key={asset.id} 
                      onSelect={() => setActiveAssetId(asset.id)}
                      className="rounded-3xl p-6 cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest">{asset.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )}
        </div>
      </header>

      <section className="flex justify-center py-4 sm:py-6">
        <button 
          onClick={handleToggleFocus}
          aria-label={isFocusing ? 'SEAL – end focus session and log time' : 'IGNITE – start focus session'}
          className={cn(
            "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center gap-4 sm:gap-8 transition-all duration-1000 luxury-shadow relative group",
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
        <section className="space-y-8 animate-in slide-in-from-bottom-16 duration-1000 px-4">
          <div className="luxury-blur p-8 rounded-[3rem] border border-white/5 bg-black/40 luxury-shadow relative overflow-hidden">
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
