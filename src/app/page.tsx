
"use client"

import React from 'react';
import { useFoco } from '@/lib/store';
import { Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyPlaybook } from '@/components/DailyPlaybook';

export default function EmpireDashboard() {
  const { 
    assets,
    assetAnalytics,
    dailyStats, 
    dailyTargetHours, 
    intensityRequired,
    isCritical,
    netInvestableWindow,
    currentVitality,
    isHydrated
  } = useFoco();

  const focusHoursToday = dailyStats.focus / 3600;
  const totalDebtHours = isHydrated && typeof assetAnalytics === 'function'
    ? assets.reduce((acc, a) => acc + assetAnalytics(a.id).debtHours, 0)
    : 0;

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Command...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-10 animate-in fade-in duration-1000">
      <header className="space-y-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-20 gold-glow">The Command</p>
        <h1 className="text-5xl luxury-text">Empire.</h1>
      </header>

      {assets.length === 0 && (
        <section className="luxury-blur p-8 rounded-[2.5rem] border border-white/10 text-center space-y-6" aria-label="Onboarding steps for new users">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">Get started</p>
          <p className="text-sm font-light opacity-70 max-w-xs mx-auto">Two steps to start tracking focus and building your Empire.</p>
          <ol className="space-y-4 text-left max-w-sm mx-auto list-none">
            <li className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-black">1</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Create your first mandate</p>
                <p className="text-[9px] opacity-60 mt-0.5">Define a goal (hours or money) in the Vault.</p>
                <a href="/sanctuary/vault" className="inline-block mt-2 px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase tracking-wider hover:bg-primary hover:text-background transition-all">
                  Open Vault
                </a>
              </div>
            </li>
            <li className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-white/10 bg-white/[0.02] opacity-70">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">2</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Start a focus block</p>
                <p className="text-[9px] opacity-60 mt-0.5">On Presence (Today), choose your mandate and log time.</p>
                <a href="/today" className="inline-block mt-2 px-4 py-2 rounded-full border border-white/20 text-[9px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all">
                  Go to Presence
                </a>
              </div>
            </li>
          </ol>
        </section>
      )}

      <section className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.8em] opacity-20">Temporal Equity Invested</p>
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
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">Mandate</p>
            <p className="text-lg font-light tabular-nums">{dailyTargetHours.toFixed(1)}h</p>
          </div>
          <div className="space-y-1 text-center border-x border-foreground/5">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">Pressure</p>
            <p className={cn(
              "text-lg font-light tabular-nums",
              isCritical ? "text-destructive" : "text-primary/60"
            )}>{(intensityRequired * 100).toFixed(0)}%</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">Vitality</p>
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

      <section className="pt-2">
        <DailyPlaybook showHeader={false} />
      </section>

      <div className="h-10" />
    </div>
  );
}
