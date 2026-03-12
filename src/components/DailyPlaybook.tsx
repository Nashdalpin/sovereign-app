"use client"

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFoco, Pillar } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Coins,
  Heart,
  User,
  Focus,
  Clock,
  Activity,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { PILLAR_CONFIG } from "@/lib/constants";
import { TaskItem } from "@/components/TaskItem";

export function DailyPlaybook({
  showHeader = true,
  className,
}: {
  showHeader?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const {
    isHydrated,
    assets,
    dailyTargetHours,
    getPriorityAsset,
    assetAnalytics,
    vitals,
    ritualDefinitions,
    intensityRequired,
    isCritical,
    getCriticalAsset,
    completedBlockIndices,
    setCurrentBlockIndex,
    toggleVital,
    getMissingCriticalRituals,
  } = useFoco();

  const criticalAsset = useMemo(() => getCriticalAsset(), [getCriticalAsset]);

  const orderedAssetsForBlocks = useMemo(() => {
    if (assets.length === 0) return [];
    const sorted = [...assets]
      .filter(a => (a.targetType ?? 'hours') === 'hours' && a.investedHours < a.targetHours)
      .sort((a, b) => {
        const pA = ['high', 'medium', 'low'].indexOf(a.priority);
        const pB = ['high', 'medium', 'low'].indexOf(b.priority);
        if (pA !== pB) return pA - pB;
        const anaA = assetAnalytics(a.id);
        const anaB = assetAnalytics(b.id);
        if (Math.abs(anaB.urgencyFactor - anaA.urgencyFactor) > 0.05) return anaB.urgencyFactor - anaA.urgencyFactor;
        if (Math.abs(anaB.debtHours - anaA.debtHours) > 0.1) return anaB.debtHours - anaA.debtHours;
        return b.targetHours - a.targetHours;
      });
    return sorted;
  }, [assets, assetAnalytics]);

  const focusBlocks = useMemo(() => {
    const blockLengthMinutes = 50;
    const maxBlocks = 3;
    const recommendedMinutes = Math.max(dailyTargetHours * 60, blockLengthMinutes);
    const rawBlocks = Math.round(recommendedMinutes / blockLengthMinutes);
    const blocksCount = Math.max(1, Math.min(maxBlocks, rawBlocks || 1));

    return Array.from({ length: blocksCount }).map((_, index) => {
      const suggestedAsset = isCritical
        ? criticalAsset
        : orderedAssetsForBlocks[index % Math.max(1, orderedAssetsForBlocks.length)];
      const priorityLabel = suggestedAsset?.priority === 'high' ? 'Alpha' : suggestedAsset?.priority === 'medium' ? 'Beta' : 'Gamma';
      const analytics = suggestedAsset ? assetAnalytics(suggestedAsset.id) : null;
      return {
        label: `Block ${index + 1}`,
        minutes: blockLengthMinutes,
        suggestedAssetId: suggestedAsset?.id ?? null,
        suggestedAssetName: suggestedAsset?.name ?? null,
        priorityLabel: suggestedAsset ? priorityLabel : null,
        urgencyFactor: analytics?.urgencyFactor ?? 0,
        blocked: isCritical && index > 0,
      };
    });
  }, [dailyTargetHours, isCritical, criticalAsset, orderedAssetsForBlocks, assetAnalytics]);

  const ritualsList = useMemo(() => {
    const entries = ritualDefinitions.map((r) => [r.id, !!vitals[r.id]] as const);
    const incompleteFirst = [...entries].sort(([, a], [, b]) => Number(a) - Number(b));
    return incompleteFirst.slice(0, 5);
  }, [vitals, ritualDefinitions]);

  const ritualById = useMemo(() => Object.fromEntries(ritualDefinitions.map((r) => [r.id, r])), [ritualDefinitions]);

  const missingRitualIds = useMemo(() => {
    const set = new Set<string>();
    PILLAR_CONFIG.forEach((pillar) => {
      const alpha = getPriorityAsset(pillar.id);
      if (!alpha) return;
      getMissingCriticalRituals(alpha).forEach((id) => set.add(id));
    });
    return Array.from(set);
  }, [getPriorityAsset, getMissingCriticalRituals]);

  const integrityMessage = useMemo(() => {
    if (missingRitualIds.length === 0) return null;
    const names = missingRitualIds
      .map((id) => ritualById[id]?.label ?? id)
      .filter(Boolean);
    if (names.length === 1) return `Complete ${names[0]} to sustain your mandates.`;
    if (names.length === 2) return `Complete ${names[0]} and ${names[1]} to sustain your mandates.`;
    return `Complete ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} to sustain your mandates.`;
  }, [missingRitualIds, ritualById]);

  if (!isHydrated) {
    return (
      <div className={cn("max-w-screen-sm mx-auto px-8 h-[50vh] flex items-center justify-center", className)}>
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Daily Playbook...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-16", className)}>
      {showHeader && (
        <header className="text-center space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[1.2em] opacity-20 gold-glow">
            Daily Playbook
          </p>
          <h1 className="text-5xl luxury-text">Directive.</h1>
          <p className="text-[9px] font-medium opacity-40 max-w-xs mx-auto">
            Auto-generated tactical script for today: Alpha mandates, focused blocks and essential rituals.
          </p>
        </header>
      )}

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-20">
            Alpha Mandates by Pillar
          </p>
          <Link
            href="/sanctuary/vault"
            className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-all"
          >
            Manage Vault
          </Link>
        </div>
        <div className="grid gap-4">
          {PILLAR_CONFIG.map((pillar) => {
            const alpha = getPriorityAsset(pillar.id);
            const analytics = alpha ? assetAnalytics(alpha.id) : null;
            const progress = alpha ? Math.min(100, (alpha.investedHours / alpha.targetHours) * 100) : 0;
            const moneyGoals = assets.filter(a => a.category === pillar.id && (a.targetType ?? 'hours') === 'money');

            return (
              <div
                key={pillar.id}
                className="luxury-blur p-5 rounded-[2rem] border border-border dark:border-white/5 bg-muted/40 dark:bg-black/25 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/60 dark:bg-white/5">
                      <pillar.icon size={18} className="opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">{pillar.label}</p>
                      {alpha ? (
                        <>
                          <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                            {alpha.name}
                          </p>
                          <p className="text-[9px] opacity-40">
                            {analytics?.dailyRequired.toFixed(1)}h required today
                          </p>
                        </>
                      ) : !moneyGoals.length ? (
                        <p className="text-[9px] opacity-30">No alpha mandate. Forge one in the Vault.</p>
                      ) : null}
                    </div>
                  </div>
                  {alpha && (
                    <div className="flex flex-col items-end gap-1 min-w-[80px]">
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">
                        {progress.toFixed(0)}%
                      </span>
                      <div className="w-full h-1 bg-muted dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary gold-glow transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {moneyGoals.length > 0 && (
                  <div className="pt-2 border-t border-border dark:border-white/5 space-y-1.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50 flex items-center gap-1.5">
                      <Banknote size={10} /> Savings
                    </p>
                    {moneyGoals.map((m) => {
                      const pct = (m.targetAmount ?? 0) > 0 ? Math.min(100, ((m.investedAmount ?? 0) / (m.targetAmount ?? 1)) * 100) : 0;
                      return (
                        <div key={m.id} className="flex justify-between items-center text-[9px]">
                          <span className="opacity-70 truncate">{m.name}</span>
                          <span className="tabular-nums text-primary opacity-90">
                            {(m.investedAmount ?? 0).toFixed(0)} / {(m.targetAmount ?? 0).toFixed(0)} € ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 px-1">
          <div className="flex justify-between items-center">
            <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-20">Focus Blocks</p>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 flex items-center gap-1">
              <Clock size={10} />
              {dailyTargetHours.toFixed(1)}H Mandate
            </span>
          </div>
          <p className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-25">By priority and urgency (Alpha → Beta → Gamma)</p>
        </div>
        <div className="grid gap-3">
          {focusBlocks.map((block, index) => {
            const completed = completedBlockIndices.includes(index);
            if (completed) return null;
            const disabled = block.blocked || block.suggestedAssetId == null;
            const handleClick = () => {
              if (completed || disabled || !block.suggestedAssetId) return;
              setCurrentBlockIndex(index, block.minutes);
              try {
                sessionStorage.setItem(
                  "sovereign_block_session",
                  JSON.stringify({
                    blockIndex: index,
                    suggestedAssetId: block.suggestedAssetId,
                    suggestedMinutes: block.minutes,
                    totalBlocks: focusBlocks.length,
                  })
                );
              } catch (_) {}
              router.push("/today");
            };
            return (
              <button
                type="button"
                key={block.label}
                onClick={handleClick}
                disabled={disabled}
                className={cn(
                  "luxury-blur p-4 rounded-[2rem] border flex items-center justify-between text-left transition-all w-full",
                  !disabled && "border-border dark:border-white/5 bg-muted/40 dark:bg-black/20 hover:border-primary/20 hover:bg-muted/60 dark:hover:bg-black/30 cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed border-border dark:border-white/5 bg-muted/40 dark:bg-black/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-60">
                      {block.label}
                      {block.priorityLabel && (
                        <span className="ml-1.5 text-primary/70">· {block.priorityLabel}</span>
                      )}
                    </p>
                    <p className="text-sm font-light truncate">
                      {block.suggestedAssetName ? (
                        <>{block.suggestedAssetName} · {block.minutes} min</>
                      ) : (
                        <>{block.minutes} min deep focus</>
                      )}
                    </p>
                  </div>
                </div>
                {block.blocked ? (
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Locked</span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 shrink-0">Slot {index + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {assets.some((a) => a.dailyTasks?.length) ? (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-20">Daily Directives</p>
            <Link
              href="/sanctuary/vault"
              className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-all"
            >
              Edit in Vault
            </Link>
          </div>
          <div className="grid gap-2">
            {assets
              .filter((a) => a.dailyTasks && a.dailyTasks.length > 0)
              .map((asset) => (
                <div key={asset.id} className="space-y-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-40 px-1">{asset.name}</p>
                  {asset.dailyTasks!.map((task) => (
                    <TaskItem key={task.id} assetId={asset.id} task={task} />
                  ))}
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] opacity-20">Essential Rituals</p>
          <Link
            href="/sanctuary"
            className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-all flex items-center gap-1"
          >
            <Focus size={10} />
            Open Altar
          </Link>
        </div>
        {integrityMessage && (
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-destructive/90 px-1">
            {integrityMessage}
          </p>
        )}
        {missingRitualIds.length === 0 && ritualsList.some(([, done]) => done) && (
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Integrity set for current mandates.</p>
        )}
        <div className="grid gap-3">
          {ritualsList.map(([id, done]) => {
            const ritual = ritualDefinitions.find((r) => r.id === id);
            const label = ritual?.label ?? id;
            const desc = ritual?.label ?? "";
            return (
              <button
                type="button"
                key={id}
                onClick={() => toggleVital(id)}
                className={cn(
                  "luxury-blur p-4 rounded-[2rem] border flex items-center justify-between text-left transition-all w-full hover:border-primary/20 dark:hover:border-white/15",
                  done ? "border-primary/30 bg-primary/5" : "border-border dark:border-white/5 bg-muted/40 dark:bg-black/20"
                )}
              >
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-60">{label}</p>
                  {desc && <p className="text-[9px] opacity-40">{desc}</p>}
                </div>
                {done && <CheckCircle2 className="text-primary gold-glow" size={16} />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

