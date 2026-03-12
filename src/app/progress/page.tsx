"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { useFoco, Pillar, SessionLog } from '@/lib/store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Clock, PieChart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateWeeklyDebrief } from '@/ai/flows/weekly-debrief-flow';
import { useToast } from '@/hooks/use-toast';

type PillarHours = Record<Pillar, number>;

function getTodayLogs(sessionLogs: SessionLog[]): SessionLog[] {
  const today = new Date().toDateString();
  return [...sessionLogs]
    .filter((log) => new Date(log.timestamp).toDateString() === today)
    .reverse();
}

function getFocusHoursForDate(sessionLogs: SessionLog[], dateStr: string): number {
  return sessionLogs
    .filter(
      (log) =>
        log.mode === 'focus' &&
        new Date(log.timestamp).toDateString() === dateStr
    )
    .reduce((acc, log) => acc + log.duration / 60, 0);
}

export default function LedgerPage() {
  const {
    sessionLogs,
    dailyStats,
    totalInvestment,
    isHydrated,
    assets,
    assetAnalytics,
    lifeTracker,
    currentTime,
  } = useFoco();
  const [mounted, setMounted] = useState(false);
  const [debrief, setDebrief] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayLogs = useMemo(() => {
    if (!isHydrated) return [];
    return getTodayLogs(sessionLogs);
  }, [sessionLogs, isHydrated]);

  const sealedTodayHours = useMemo(() => {
    return todayLogs.reduce((acc, log) => acc + log.duration / 60, 0);
  }, [todayLogs]);

  const inProgressSecs = useMemo(() => {
    if (lifeTracker.activeMode !== 'focus') return 0;
    return Math.max(0, Math.floor((currentTime - lifeTracker.stateStartTime) / 1000));
  }, [lifeTracker.activeMode, lifeTracker.stateStartTime, currentTime]);

  const inProgressHours = inProgressSecs / 3600;
  const activeAssetName =
    lifeTracker.activeMode === 'focus'
      ? (lifeTracker.activeAssetId ? assets.find((a) => a.id === lifeTracker.activeAssetId)?.name ?? 'Unspecified Focus' : 'Unspecified Focus')
      : null;

  const chartData = useMemo(() => {
    if (!isHydrated) return [];
    const data: { day: string; focus: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = d
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase();

      const focusHours = getFocusHoursForDate(sessionLogs, dateStr);

      data.push({
        day: dayLabel,
        focus: parseFloat(focusHours.toFixed(1)),
      });
    }
    return data;
  }, [sessionLogs, isHydrated]);

  const heatmapData = useMemo(() => {
    if (!isHydrated) return [];
    const days = 56; // 8 weeks
    const lattice: { intensity: number; hours: number; date: Date }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const dayHours = getFocusHoursForDate(sessionLogs, dateStr);

      let intensity = 0;
      if (dayHours > 0) intensity = 1;
      if (dayHours > 2) intensity = 2;
      if (dayHours > 5) intensity = 3;

      lattice.push({ intensity, hours: dayHours, date: d });
    }
    return lattice;
  }, [sessionLogs, isHydrated]);

  const weeklyStats = useMemo(() => {
    if (!isHydrated) {
      return {
        totalWeekHours: 0,
        pillarHours: {
          capital: 0,
          professional: 0,
          vitality: 0,
          personal: 0,
        } as PillarHours,
        topAdvanced: [] as { name: string; category: string; hours: number }[],
        topDebt: [] as { name: string; category: string; debtHours: number }[],
      };
    }

    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const weekLogs = sessionLogs.filter((log) => {
      if (log.mode !== 'focus') return false;
      const ts = new Date(log.timestamp).getTime();
      return ts >= start.getTime() && ts <= end.getTime();
    });

    const assetMinutes = new Map<string, number>();
    weekLogs.forEach((log) => {
      const key = log.assetId ?? log.assetName;
      const prev = assetMinutes.get(key) ?? 0;
      assetMinutes.set(key, prev + log.duration);
    });

    const assetsById = new Map(assets.map((a) => [a.id, a]));
    const assetsByName = new Map(
      assets.map((a) => [a.name.toLowerCase(), a])
    );
    const resolveAsset = (key: string) =>
      assetsById.get(key) ?? assetsByName.get(key.toLowerCase());

    const pillarHours: PillarHours = {
      capital: 0,
      professional: 0,
      vitality: 0,
      personal: 0,
    };

    assetMinutes.forEach((minutes, key) => {
      const asset = resolveAsset(key);
      const hours = minutes / 60;
      if (asset) {
        pillarHours[asset.category] += hours;
      }
    });

    const topAdvanced = Array.from(assetMinutes.entries())
      .map(([key, minutes]) => {
        const asset = resolveAsset(key);
        const name = asset?.name ?? key;
        return {
          name,
          category: asset ? asset.category : 'unassigned',
          hours: minutes / 60,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3);

    const topDebt = assets
      .map((asset) => {
        const analytics = assetAnalytics(asset.id);
        return {
          name: asset.name,
          category: asset.category,
          debtHours: analytics.debtHours,
        };
      })
      .filter((a) => a.debtHours > 0)
      .sort((a, b) => b.debtHours - a.debtHours)
      .slice(0, 3);

    const totalWeekMinutes = weekLogs.reduce(
      (acc, log) => acc + log.duration,
      0
    );

    return {
      totalWeekHours: totalWeekMinutes / 60,
      pillarHours,
      topAdvanced,
      topDebt,
    };
  }, [sessionLogs, assets, assetAnalytics, isHydrated]);

  const DEBRIEF_TIMEOUT_MS = 30_000;

  const handleGenerateDebrief = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setDebriefError(null);
    const showError = (msg: string) => {
      setDebriefError(msg);
      toast({ title: 'Council', description: msg, variant: 'elegant' });
    };
    try {
      const totalWeekHours = Number(weeklyStats.totalWeekHours);
      const safePayload = {
        totalWeekHours: Number.isFinite(totalWeekHours) ? totalWeekHours : 0,
        pillarHours: { ...weeklyStats.pillarHours },
        topAdvanced: Array.isArray(weeklyStats.topAdvanced) ? weeklyStats.topAdvanced : [],
        topDebt: Array.isArray(weeklyStats.topDebt) ? weeklyStats.topDebt : [],
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DEBRIEF_TIMEOUT')), DEBRIEF_TIMEOUT_MS);
      });
      const result = await Promise.race([
        generateWeeklyDebrief(safePayload),
        timeoutPromise,
      ]);

      if (result == null || typeof result !== 'object') {
        showError('Resposta inválida do servidor. Confirma GEMINI_API_KEY em .env e tenta de novo.');
        return;
      }

      let err: string | undefined;
      let summary: string | undefined;
      try {
        err = (result as { error?: string }).error;
        summary = (result as { summary?: string }).summary;
      } catch (_) {
        showError('Erro ao ler a resposta. Tenta de novo.');
        return;
      }

      if (err === 'MISSING_API_KEY') {
        showError('Falta GEMINI_API_KEY no servidor. Adiciona em .env ou .env.local e reinicia o servidor.');
        return;
      }
      if (err === 'QUOTA_EXCEEDED') {
        showError('Limite da API excedido. Tenta daqui a uns momentos.');
        return;
      }
      if (err === 'NO_SUMMARY' || err === 'UNKNOWN_ERROR') {
        showError(err === 'NO_SUMMARY' ? 'O Council não devolveu texto. Tenta outra vez.' : 'Não foi possível gerar o relatório.');
        return;
      }

      if (typeof summary === 'string' && summary.trim()) {
        setDebrief(summary.trim());
        setDebriefError(null);
      } else {
        showError('Nenhum texto devolvido. Verifica GEMINI_API_KEY em .env e tenta de novo.');
      }
    } catch (e) {
      const isTimeout = e instanceof Error && e.message === 'DEBRIEF_TIMEOUT';
      console.error('Weekly Debrief Error', e);
      showError(
        isTimeout
          ? 'Pedido demorou demasiado. Verifica a ligação e GEMINI_API_KEY em .env.'
          : 'Não foi possível gerar o relatório. Tenta de novo.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mounted || !isHydrated)
    return (
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Ledger...
        </p>
      </div>
    );

  return (
    <div className="max-w-screen-sm mx-auto px-4 sm:px-6 md:px-8 space-y-20 animate-in fade-in duration-1000">
      <header className="space-y-2 text-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20">
          Audit Records
        </p>
        <h1 className="text-5xl luxury-text">Ledger.</h1>
      </header>

      <section className="grid grid-cols-2 gap-6">
        <div className="luxury-blur p-8 rounded-[2rem] luxury-shadow space-y-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">
            Total Equity
          </p>
          <p className="text-3xl font-light tracking-tighter tabular-nums">
            {totalInvestment.toFixed(1)}
            <span className="text-[10px] ml-1 opacity-20 font-bold tracking-widest">
              H
            </span>
          </p>
        </div>
        <div className="luxury-blur p-8 rounded-[2rem] luxury-shadow space-y-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">
            Daily Yield
          </p>
          <p className="text-3xl font-light tracking-tighter tabular-nums text-primary">
            {(dailyStats.focus / 3600).toFixed(1)}
            <span className="text-[10px] ml-1 opacity-20 font-bold tracking-widest">
              H
            </span>
          </p>
        </div>
      </section>

      <section className="luxury-blur p-8 rounded-[2.5rem] luxury-shadow space-y-8 min-h-[240px]">
        <div className="flex justify-between items-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">
            Performance Curve
          </p>
          <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30 flex items-center gap-1">
            <PieChart size={10} />
            {weeklyStats.totalWeekHours.toFixed(1)}h / 7d
          </span>
        </div>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorFocus"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '1rem',
                  border: 'none',
                  fontSize: '10px',
                }}
              />
              <Area
                type="monotone"
                dataKey="focus"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorFocus)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <PieChart size={12} className="text-primary/40" />
            <p className="text-[9px] font-bold uppercase tracking-[0.8em] opacity-20">
              Presence Lattice
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  "w-2 h-2 rounded-[2px] transition-all duration-500",
                  lvl === 0
                    ? "bg-muted/50 dark:bg-white/[0.03]"
                    : lvl === 1
                      ? "bg-primary/20"
                      : lvl === 2
                        ? "bg-primary/50"
                        : "bg-primary gold-glow"
                )}
              />
            ))}
          </div>
        </div>
        <div className="luxury-blur p-6 rounded-[2.5rem] luxury-shadow border border-border dark:border-white/5 bg-muted/40 dark:bg-black/40">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-max">
              {heatmapData.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-3.5 h-3.5 rounded-[3px] transition-all duration-700 cursor-default border border-border/50 dark:border-white/[0.02]",
                    day.intensity === 0
                      ? "bg-muted/50 dark:bg-white/[0.02] hover:bg-muted/70 dark:hover:bg-white/[0.08]"
                      : day.intensity === 1
                        ? "bg-primary/10 hover:bg-primary/20"
                        : day.intensity === 2
                          ? "bg-primary/30 hover:bg-primary/40 shadow-[0_0_8px_rgba(212,175,55,0.1)]"
                          : "bg-primary gold-glow shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110"
                  )}
                  title={`${day.hours.toFixed(1)}h focus on ${day.date.toLocaleDateString()}`}
                />
              ))}
            </div>
          </div>
          <p className="text-[7px] font-bold uppercase tracking-[0.4em] opacity-10 mt-4 text-center">
            8-Week Tactical Continuity
          </p>
        </div>
      </section>

      <section className="luxury-blur p-6 rounded-[2rem] luxury-shadow space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">
            Weekly Pillar Distribution
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['capital', 'professional', 'vitality', 'personal'] as Pillar[]).map(
            (pillar) => (
              <div key={pillar} className="space-y-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-40">
                  {pillar}
                </p>
                <p className="text-sm font-light tabular-nums">
                  {weeklyStats.pillarHours[pillar].toFixed(1)}
                  <span className="text-[9px] ml-1 opacity-30">h</span>
                </p>
                <div className="h-1 w-full bg-muted dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 gold-glow"
                    style={{
                      width: `${Math.min(
                        100,
                        (weeklyStats.pillarHours[pillar] /
                          (weeklyStats.totalWeekHours || 1)) *
                          100
                      ).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-20">
            Council Weekly Debrief
          </p>
          <button
            onClick={handleGenerateDebrief}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.5em] transition-all',
              isGenerating
                ? 'border-border dark:border-white/10 opacity-40'
                : 'border-primary/40 text-primary bg-primary/5 hover:bg-primary hover:text-background'
            )}
            disabled={isGenerating}
          >
            <Sparkles size={10} />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {debriefError ? (
          <div className="rounded-xl border-2 border-destructive/50 bg-destructive/15 px-4 py-4 text-sm text-destructive font-medium" role="alert">
            {debriefError}
          </div>
        ) : debrief ? (
          <div className="luxury-blur p-6 rounded-[2rem] border border-border dark:border-white/10 bg-muted/40 dark:bg-black/40 text-sm leading-relaxed">
            {debrief}
          </div>
        ) : (
          <p className="text-[9px] opacity-40">
            Ainda sem relatório. Clica em «Generate Report» acima para o Council analisar a última semana.
          </p>
        )}
      </section>

      <section className="space-y-8">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.6em] opacity-20">
            Audit Ledger Today
          </p>
          <p className="text-[8px] font-medium opacity-30 mt-1">
            Focus sessions (Presence and Focus Blocks) recorded today. Sealed + in progress = Daily Yield above.
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-[8px] font-bold uppercase tracking-[0.3em] opacity-40">
            <span>Sealed today: {(sealedTodayHours).toFixed(1)}h</span>
            {lifeTracker.activeMode === 'focus' && (
              <span className="text-primary">In progress: {(inProgressHours).toFixed(1)}h</span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {lifeTracker.activeMode === 'focus' && (
            <div className="luxury-blur p-6 rounded-[1.5rem] flex justify-between items-center border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                  <Zap size={12} />
                </div>
                <div>
                  <p className="text-sm font-light">{activeAssetName}</p>
                  <p className="text-[8px] font-black uppercase opacity-50">In progress</p>
                </div>
              </div>
              <p className="text-xl font-light tabular-nums tracking-tighter text-primary">
                {Math.floor(inProgressSecs / 60)}m
              </p>
            </div>
          )}
          {todayLogs.map((log) => (
            <div
              key={log.id}
              className="luxury-blur p-6 rounded-[1.5rem] flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/5 text-primary">
                  <Zap size={12} />
                </div>
                <div>
                  <p className="text-sm font-light">{log.assetId ? assets.find((a) => a.id === log.assetId)?.name ?? log.assetName : log.assetName}</p>
                  <p className="text-[8px] font-black uppercase opacity-20">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <p className="text-xl font-light tabular-nums tracking-tighter">
                {Math.floor(log.duration / 60)}h {log.duration % 60}m
              </p>
            </div>
          ))}
          {todayLogs.length === 0 && lifeTracker.activeMode !== 'focus' && (
            <div className="py-12 text-center opacity-20 flex flex-col items-center gap-4 border border-dashed border-foreground/5 rounded-[2rem]">
              <Clock size={24} />
              <p className="text-[8px] font-bold uppercase tracking-[0.6em]">
                No Activity Found
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}