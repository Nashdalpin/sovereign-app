
"use client"

import React from 'react';
import { useFoco, Pillar } from '@/lib/store';
import { RITUAL_ICON_MAP } from '@/lib/ritual-icons';
import { CheckCircle2, Coins, Briefcase, User, ArrowRight, Focus, Gem, Heart, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { PILLAR_CONFIG } from '@/lib/constants';

export default function SanctuaryPage() {
  const { vitals, toggleVital, currentVitality, isHydrated, getPriorityAsset, assetAnalytics, getPillarRituals, ritualDefinitions, assets } = useFoco();
  const ritualById = Object.fromEntries(ritualDefinitions.map((r) => [r.id, r]));

  if (!isHydrated) {
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
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

      <section className="flex flex-col items-center py-4">
        <div className="relative group">
          <div className="w-40 h-40 rounded-full border border-white/10 flex flex-col items-center justify-center luxury-blur luxury-shadow relative z-10 bg-black/30 group-hover:border-primary/20 transition-all duration-700">
            <p className="text-5xl font-light tabular-nums luxury-text">{currentVitality}<span className="text-base opacity-20">/10</span></p>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 mt-2">Integrity</p>
          </div>
          <div className="absolute -inset-4 rounded-full border border-primary/5 animate-[spin_120s_linear_infinite] border-dashed" />
          <div className="absolute -inset-8 rounded-full border border-foreground/5 animate-[spin_180s_linear_reverse_infinite]" />
        </div>
      </section>

      <Tabs defaultValue="vitality" className="w-full space-y-12">
        <TabsList className="w-full h-14 bg-white/[0.02] rounded-full p-1.5 luxury-blur flex justify-between border border-white/10">
          {PILLAR_CONFIG.map(p => (
            <TabsTrigger 
              key={p.id} value={p.id}
              className="flex-1 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-700 py-1.5"
            >
              <p.icon size={16} strokeWidth={1.5} />
            </TabsTrigger>
          ))}
        </TabsList>

        {PILLAR_CONFIG.map(pillar => {
          const alphaMandate = getPriorityAsset(pillar.id);
          const analytics = alphaMandate ? assetAnalytics(alphaMandate.id) : null;
          const progress = alphaMandate ? Math.min(100, (alphaMandate.investedHours / alphaMandate.targetHours) * 100) : 0;
          const moneyGoals = assets.filter(a => a.category === pillar.id && (a.targetType ?? 'hours') === 'money');
          return (
            <TabsContent key={pillar.id} value={pillar.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="text-center space-y-1">
                <h2 className="text-2xl luxury-text">{pillar.label}</h2>
                <p className="text-[8px] font-bold uppercase tracking-[0.6em] opacity-20">{pillar.description}</p>
              </div>

              {getPillarRituals(pillar.id).length > 0 && (
                <div className="space-y-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-10 px-2">Maintenance Protocol</p>
                  <div className="grid gap-3">
                    {getPillarRituals(pillar.id).map(rid => {
                      const ritual = ritualById[rid];
                      const IconComp = ritual ? RITUAL_ICON_MAP[ritual.icon] : null;
                      const isActive = !!vitals[rid];
                      if (!ritual || !IconComp) return null;
                      return (
                        <button
                          key={rid}
                          onClick={() => toggleVital(rid)}
                          aria-label={isActive ? `Mark ${ritual.label} as incomplete` : `Mark ${ritual.label} as complete`}
                          className={cn(
                            "w-full luxury-blur p-5 rounded-[2rem] border transition-all duration-700 text-left flex items-center justify-between luxury-shadow",
                            isActive ? "border-primary/40 bg-primary/5" : "border-white/5 opacity-40 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700",
                              isActive ? "bg-primary text-background shadow-[0_0_20px_rgba(212,175,55,0.4)]" : "bg-white/5 text-white/20"
                            )}>
                              <IconComp size={18} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-0.5">
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-primary gold-glow" : "opacity-40")}>{ritual.label}</p>
                              <p className="text-[7px] font-medium opacity-20">{ritual.label}</p>
                            </div>
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
                  <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-10">Alpha Mandate</p>
                  <Link href="/sanctuary/vault" className="p-2 opacity-30 hover:opacity-100 transition-all">
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {!alphaMandate && moneyGoals.length === 0 ? (
                  <Link href="/sanctuary/vault" className="block p-10 text-center opacity-30 border border-dashed border-white/5 rounded-[2.5rem] hover:opacity-100 transition-all bg-white/[0.01]">
                    <Focus size={24} className="mx-auto mb-3 opacity-10" />
                    <p className="text-[9px] font-black uppercase tracking-[0.6em]">Establish Alpha</p>
                  </Link>
                ) : !alphaMandate && moneyGoals.length > 0 ? (
                  <div className="space-y-6">
                    <div className="luxury-blur p-6 rounded-[2.5rem] space-y-6 border border-white/5 luxury-shadow relative overflow-hidden bg-black/40">
                      <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50 flex items-center gap-2">
                        <Banknote size={12} /> Savings goals
                      </p>
                      {moneyGoals.map((m) => {
                        const pct = (m.targetAmount ?? 0) > 0 ? Math.min(100, ((m.investedAmount ?? 0) / (m.targetAmount ?? 1)) * 100) : 0;
                        return (
                          <div key={m.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-light">{m.name}</p>
                              <span className="text-[9px] tabular-nums text-primary">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary gold-glow transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[8px] tabular-nums opacity-40">{(m.investedAmount ?? 0).toFixed(0)} € / {(m.targetAmount ?? 0).toFixed(0)} €</p>
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
                          <h3 className="text-lg luxury-text">{alphaMandate.name}</h3>
                          <span className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full border border-primary/40 text-primary bg-primary/10">ALPHA</span>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">{alphaMandate.targetHours}h Mandate</p>
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
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
      <div className="h-10" />
    </div>
  );
}
