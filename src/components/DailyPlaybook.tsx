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
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { PILLAR_CONFIG } from "@/lib/constants";
import { TaskItem } from "@/components/TaskItem";
import { RITUAL_ICON_MAP } from "@/lib/ritual-icons";

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
    getSuggestedFocusAsset,
    getActiveMandateAssets,
    getFocusBlocks,
    getNextFocusBlock,
    assetAnalytics,
    vitals,
    toggleVital,
    ritualDefinitions,
    intensityRequired,
    isCritical,
    getCriticalAsset,
    completedBlockIndices,
    setCurrentBlockIndex,
  } = useFoco();

  const criticalAsset = useMemo(() => getCriticalAsset(), [getCriticalAsset]);
  const suggestedFocusAsset = useMemo(() => getSuggestedFocusAsset(), [getSuggestedFocusAsset]);

  const focusBlocks = useMemo(() => {
    const blocks = getFocusBlocks();
    return blocks.map((block) => {
      const asset = block.suggestedAssetId ? assets.find((a) => a.id === block.suggestedAssetId) : null;
      const priorityLabel = asset?.priority === 'high' ? 'Alpha' : asset?.priority === 'medium' ? 'Beta' : 'Gamma';
      const analytics = block.suggestedAssetId ? assetAnalytics(block.suggestedAssetId) : null;
      return {
        label: `Block ${block.index + 1}`,
        minutes: block.minutes,
        suggestedAssetId: block.suggestedAssetId,
        suggestedAssetName: block.suggestedAssetName,
        priorityLabel: asset ? priorityLabel : null,
        urgencyFactor: analytics?.urgencyFactor ?? 0,
        blocked: block.blocked,
      };
    });
  }, [getFocusBlocks, assets, assetAnalytics]);

  const ritualsList = useMemo(() => {
    const entries = ritualDefinitions
      .filter((r) => (r as { type?: string }).type !== 'number')
      .map((r) => [r.id, !!vitals[r.id]] as const);
    const sorted = [...entries].sort(([, doneA], [, doneB]) => (doneA ? 2 : 1) - (doneB ? 2 : 1));
    return sorted.slice(0, 7);
  }, [vitals, ritualDefinitions]);

  const ritualById = useMemo(() => Object.fromEntries(ritualDefinitions.map((r) => [r.id, r])), [ritualDefinitions]);

  const missingRitualIds = useMemo(() => {
    return ritualDefinitions
      .filter((r) => (r as { type?: string }).type !== 'number' && !vitals[r.id])
      .map((r) => r.id);
  }, [ritualDefinitions, vitals]);

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
          <p className="text-[10px] font-black uppercase tracking-[1.2em] text-muted-foreground gold-glow">
            Daily Playbook
          </p>
          <h1 className="text-5xl luxury-text">Directive.</h1>
          <p className="text-[9px] font-medium text-muted-foreground max-w-xs mx-auto">
            Auto-generated tactical script for today: Alpha mandates, focused blocks and essential rituals.
          </p>
        </header>
      )}

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">
            Alpha Mandates by Pillar
          </p>
          <Link
            href="/sanctuary/vault"
            className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground transition-all"
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
            <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Focus Blocks</p>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {dailyTargetHours.toFixed(1)}H Mandate
            </span>
          </div>
          <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-muted-foreground">By priority and urgency (Alpha → Beta → Gamma)</p>
        </div>
        <div className="grid gap-3">
          {(() => {
            const nextBlock = getNextFocusBlock();
            return focusBlocks.map((block, index) => {
              const completed = completedBlockIndices.includes(index);
              if (completed) return null;
              const disabled = block.blocked || block.suggestedAssetId == null;
              const isNext = nextBlock?.index === index && !block.blocked;
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
                  !disabled && isNext && "border-primary/20 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15",
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
                      {isNext && (
                        <span className="ml-1.5 text-primary font-bold">· Next</span>
                      )}
                      {!isNext && block.priorityLabel && (
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
                ) : isNext ? (
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary/80 shrink-0">Start in Presence</span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 shrink-0">Slot {index + 1}</span>
                )}
              </button>
            );
          });
          })()}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Sustain your mandates</p>
          <Link
            href="/sanctuary"
            className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
          >
            <Focus size={10} />
            Open Altar
          </Link>
        </div>
        <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-muted-foreground px-1">Complete these to support your Alpha mandates and Integrity.</p>
        {integrityMessage && (
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-destructive/90 px-1">
            {integrityMessage}
          </p>
        )}
        {missingRitualIds.length === 0 && (
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">Integrity set for current mandates.</p>
        )}
        <p className="text-[7px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 px-1">Mark here to track your plan; this drives your Integrity score.</p>
        <div className="grid gap-3">
          {ritualsList.map(([id, done]) => {
            const ritual = ritualById[id];
            const label = ritual?.label ?? id;
            const IconComp = ritual && RITUAL_ICON_MAP[ritual.icon] ? RITUAL_ICON_MAP[ritual.icon] : Sparkles;
            return (
              <button
                type="button"
                key={id}
                onClick={() => toggleVital(id)}
                aria-label={done ? `Mark ${label} as incomplete` : `Mark ${label} as complete`}
                aria-pressed={done}
                className={cn(
                  "w-full luxury-blur p-5 rounded-[2rem] border transition-all duration-700 luxury-shadow text-left flex items-center justify-between",
                  done ? "border-primary/40 bg-primary/5" : "border-border dark:border-white/5 bg-muted/40 dark:bg-black/20 hover:border-primary/20 dark:hover:border-white/15"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-700",
                    done ? "bg-primary text-background shadow-[0_0_20px_rgba(212,175,55,0.4)]" : "bg-white/5 dark:bg-black/30 text-white/20"
                  )}>
                    <IconComp size={18} strokeWidth={1.5} aria-hidden />
                  </div>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", done ? "text-primary gold-glow" : "text-muted-foreground")}>{label}</p>
                </div>
                {done && <CheckCircle2 size={14} className="text-primary gold-glow shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </section>

      {assets.some((a) => a.dailyTasks?.length) ? (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-[8px] font-black uppercase tracking-[0.8em] text-muted-foreground">Daily Directives</p>
            <Link
              href="/sanctuary/vault"
              className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground transition-all"
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
    </div>
  );
}

