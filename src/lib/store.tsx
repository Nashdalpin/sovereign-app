
"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Pillar, Priority } from '@/lib/constants';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

export type LifeMode = 'passive' | 'focus';
export type { Pillar, Priority };

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export type DailyDirective = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
};

export type SessionLog = {
  id: number;
  assetName: string;
  assetId?: string;
  duration: number; // minutos
  timestamp: string;
  mode: LifeMode;
};

export type RitualDefinition = {
  id: string;
  label: string;
  labelPt: string;
  icon: string;
  /** 'check' = checkbox (default), 'number' = daily numeric input */
  type?: 'check' | 'number';
  /** For type 'number': unit label (e.g. kg, lbs, cm) */
  unit?: string;
  /** For type 'number': optional target to show (e.g. 70) */
  targetValue?: number;
};

export type AssetTargetType = 'hours' | 'money';

export type Asset = {
  id: string;
  name: string;
  category: Pillar;
  priority: Priority;
  targetHours: number;
  investedHours: number;
  horizonYears: 1 | 5 | 10;
  dailyTasks: DailyDirective[];
  createdAt: string;
  /** Critical rituals for this mandate; ritual ids */
  criticalRituals?: string[];
  /** When 'money', target is in currency; progress via goal entries */
  targetType?: AssetTargetType;
  targetAmount?: number;
  investedAmount?: number;
  currency?: string;
  /** Parent long-term goal; null = root. Baby steps have this set. */
  parentAssetId?: string | null;
  /** Order in path (1 = first step) among siblings with same parent */
  stepOrder?: number | null;
  /** When set on Professional/Personal/Vitality: Capital asset that tracks money for this goal */
  linkedCapitalAssetId?: string | null;
  /** Target value for measurable goals (e.g. weight, waist); unit in targetUnit */
  targetWeight?: number | null;
  /** Current value for progress */
  currentWeight?: number | null;
  /** Optional unit for target/current (e.g. kg, lbs, cm) */
  targetUnit?: string | null;
};

export type GoalEntry = {
  id: string;
  assetId: string;
  amount: number;
  currency: string;
  timestamp: string;
  note?: string | null;
};

/** Daily state per ritual (id -> checked or not). Keys come from ritualDefinitions. */
export type Vitals = Record<string, boolean>;

/** Daily numeric values for rituals with type 'number'. ritualId -> value */
export type RitualNumericValues = Record<string, number>;

export type RitualNumericHistoryEntry = { ritualId: string; date: string; value: number };
export type RitualNumericHistory = RitualNumericHistoryEntry[];

interface AssetStoreContextType {
  assets: Asset[];
  goalEntries: GoalEntry[];
  addGoalEntry: (assetId: string, amount: number, note?: string | null) => void;
  deleteGoalEntry: (id: string) => void;
  getGoalEntriesForAsset: (assetId: string) => GoalEntry[];
  lifeTracker: {
    activeMode: LifeMode;
    activeAssetId: string | null;
    stateStartTime: number;
    todayFocusSecs: number;
  };
  vitals: Vitals;
  ritualNumericValues: RitualNumericValues;
  /** Time series of numeric ritual values (from API). Keyed by ritual for charts/trends. */
  ritualNumericHistory: RitualNumericHistory;
  setRitualNumericValue: (ritualId: string, value: number | null) => void;
  ritualDefinitions: RitualDefinition[];
  addRitual: (def: RitualDefinition) => void;
  deleteRitual: (id: string) => void;
  sessionLogs: SessionLog[];
  totalInvestment: number;
  dailyTargetHours: number;
  isHydrated: boolean;
  addAsset: (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10, moneyGoal?: { targetAmount: number; currency?: string }, pathOptions?: { parentAssetId: string; stepOrder: number }) => void;
  /** Creates a Capital sub-goal for the amount, then the main goal (hours) with link. Use for Professional/Personal/Vitality when goal has a cost. */
  addAssetWithLinkedCapital: (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10, capitalAmount: number, pathOptions?: { parentAssetId: string; stepOrder: number }, weight?: { targetWeight: number; currentWeight?: number; unit?: string }) => void;
  deleteAsset: (id: string) => void;
  toggleFocus: (assetId?: string | null) => void;
  updateAssetTasks: (assetId: string, tasks: { title: string, priority: Priority }[]) => void;
  toggleTask: (assetId: string, taskId: string) => void;
  toggleVital: (key: string) => void;
  dailyStats: { focus: number };
  intensityRequired: number;
  /** True when pressure >= 100%: cannot finish all mandates today; UI locks to most urgent. */
  isCritical: boolean;
  netInvestableWindow: number;
  remainingCycleHours: number;
  currentVitality: number;
  assetAnalytics: (assetId: string) => {
    dailyRequired: number;
    initialDailyRequired: number;
    urgencyFactor: number;
    debtHours: number;
    status: 'on-track' | 'behind' | 'critical';
  };
  getPriorityAsset: (category: Pillar) => Asset | null;
  /** Next suggested step in path (baby step or root goal); respects dependency order. */
  getNextStepInPath: (category: Pillar) => Asset | null;
  isAssetComplete: (asset: Asset) => boolean;
  completedBlockIndices: number[];
  currentBlockIndex: number | null;
  setCurrentBlockIndex: (index: number | null, suggestedMinutes?: number) => void;
  addCompletedBlock: (index: number) => void;
  setActiveAssetId: (assetId: string | null) => void;
  getCriticalAsset: () => Asset | null;
  currentTime: number;
  getMissingCriticalRituals: (asset: Asset | null) => string[];
  getPillarRituals: (pillar: Pillar) => string[];
  setPillarRituals: (pillar: Pillar, rituals: string[]) => void;
  updateAssetCriticalRituals: (assetId: string, rituals: string[]) => void;
  getDefaultCriticalRitualsForPillar: (pillar: Pillar) => string[];
  updateAsset: (assetId: string, updates: Partial<Pick<Asset, 'name' | 'category' | 'targetHours' | 'horizonYears' | 'priority' | 'targetAmount' | 'currency' | 'parentAssetId' | 'stepOrder' | 'linkedCapitalAssetId' | 'targetWeight' | 'currentWeight' | 'targetUnit'>>) => void;
}

const AssetStoreContext = createContext<AssetStoreContextType | undefined>(undefined);

/** Fallback when context is undefined (e.g. SSR duplicate module) so useFoco() does not throw and cause HTTP 500. */
function getDefaultFocoContext(): AssetStoreContextType {
  const noop = () => {};
  const now = Date.now();
  return {
    assets: [],
    goalEntries: [],
    addGoalEntry: noop,
    deleteGoalEntry: noop,
    getGoalEntriesForAsset: () => [],
    lifeTracker: { activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 },
    vitals: {},
    ritualNumericValues: {},
    ritualNumericHistory: [],
    setRitualNumericValue: noop,
    ritualDefinitions: DEFAULT_RITUAL_DEFINITIONS,
    addRitual: noop,
    deleteRitual: noop,
    sessionLogs: [],
    totalInvestment: 0,
    dailyTargetHours: 0,
    isHydrated: false,
    addAsset: noop,
    addAssetWithLinkedCapital: noop,
    deleteAsset: noop,
    toggleFocus: noop,
    updateAssetTasks: noop,
    toggleTask: noop,
    toggleVital: noop,
    dailyStats: { focus: 0 },
    intensityRequired: 0,
    isCritical: false,
    netInvestableWindow: 24,
    remainingCycleHours: 24,
    currentVitality: 0,
    assetAnalytics: () => ({ dailyRequired: 0, initialDailyRequired: 0, urgencyFactor: 1, debtHours: 0, status: 'on-track' as const }),
    getPriorityAsset: () => null,
    getNextStepInPath: () => null,
    isAssetComplete: () => false,
    completedBlockIndices: [],
    currentBlockIndex: null,
    setCurrentBlockIndex: noop,
    addCompletedBlock: noop,
    setActiveAssetId: noop,
    getCriticalAsset: () => null,
    currentTime: now,
    getMissingCriticalRituals: () => [],
    getPillarRituals: () => [],
    setPillarRituals: noop,
    updateAssetCriticalRituals: noop,
    getDefaultCriticalRitualsForPillar: () => [],
    updateAsset: noop,
  };
}

/** At or above 100% pressure, user cannot finish all daily mandates; lock to Emergency Alpha. */
export const CRITICAL_PRESSURE_THRESHOLD = 1.0;

const DEFAULT_RITUAL_DEFINITIONS: RitualDefinition[] = [
  { id: 'sleep', label: 'Cognitive Recovery', labelPt: 'Sono', icon: 'moon' },
  { id: 'fitness', label: 'Physical Dominance', labelPt: 'Fitness', icon: 'dumbbell' },
  { id: 'nutrition', label: 'Strategic Fuel', labelPt: 'Nutrição', icon: 'apple' },
  { id: 'meditation', label: 'Mental Threshold', labelPt: 'Meditação', icon: 'heart' },
  { id: 'hydration', label: 'Hydration Protocol', labelPt: 'Hidratação', icon: 'droplets' },
];

const DEFAULT_CRITICAL_RITUALS_BY_PILLAR: Record<Pillar, string[]> = {
  vitality: ['sleep', 'fitness', 'hydration'],
  personal: ['meditation'],
  capital: ['nutrition'],
  professional: [],
};

export function FocoProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ritualDefinitions, setRitualDefinitions] = useState<RitualDefinition[]>(DEFAULT_RITUAL_DEFINITIONS);
  const [vitals, setVitals] = useState<Vitals>(() =>
    DEFAULT_RITUAL_DEFINITIONS.reduce<Vitals>((acc, r) => ({ ...acc, [r.id]: false }), {})
  );
  const [lifeTracker, setLifeTracker] = useState({
    activeMode: 'passive' as LifeMode,
    activeAssetId: null as string | null,
    stateStartTime: Date.now(),
    todayFocusSecs: 0
  });
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [completedBlockIndices, setCompletedBlockIndices] = useState<number[]>([]);
  const [currentBlockIndex, setCurrentBlockIndexState] = useState<number | null>(null);
  const [currentBlockSuggestedMinutes, setCurrentBlockSuggestedMinutes] = useState<number | null>(null);
  const [pillarRitualsConfig, setPillarRitualsConfig] = useState<Record<Pillar, string[]>>(DEFAULT_CRITICAL_RITUALS_BY_PILLAR);
  const [ritualNumericValues, setRitualNumericValuesState] = useState<RitualNumericValues>({});
  const [ritualNumericHistory, setRitualNumericHistory] = useState<RitualNumericHistory>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const initialLoadFromApiDone = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    setCurrentTime(now);

    async function hydrate() {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const dateStr = new Date().toDateString();
        const url = `/api/me/data?date=${encodeURIComponent(dateStr)}`;
        const maxAttempts = 3;
        const retryDelayMs = 1000;
        let res: Response | null = null;
        let lastErr: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            res = await fetch(url);
            if (res.ok) break;
            lastErr = new Error(`HTTP ${res.status}`);
          } catch (e) {
            lastErr = e;
          }
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, retryDelayMs));
          }
        }
        try {
          if (res?.ok) {
            const data = await res.json();
            setAssets((data.assets ?? []).map((a: Record<string, unknown>) => ({
              ...a,
              targetType: a.targetType ?? 'hours',
              targetAmount: a.targetAmount != null ? Number(a.targetAmount) : undefined,
              investedAmount: a.investedAmount != null ? Number(a.investedAmount) : undefined,
              currency: a.currency ?? undefined,
              parentAssetId: a.parentAssetId ?? undefined,
              stepOrder: a.stepOrder != null ? Number(a.stepOrder) : undefined,
              linkedCapitalAssetId: a.linkedCapitalAssetId ?? undefined,
              targetWeight: a.targetWeight != null ? Number(a.targetWeight) : undefined,
              currentWeight: a.currentWeight != null ? Number(a.currentWeight) : undefined,
              targetUnit: a.targetUnit ?? undefined,
            })));
            setSessionLogs(data.sessionLogs ?? []);
            setGoalEntries(data.goalEntries ?? []);
            const defs = (data.appState?.ritualDefinitions && Array.isArray(data.appState.ritualDefinitions) && data.appState.ritualDefinitions.length > 0)
              ? data.appState.ritualDefinitions
              : DEFAULT_RITUAL_DEFINITIONS;
            setRitualDefinitions(defs);
            if (data.appState?.pillarRitualsConfig && typeof data.appState.pillarRitualsConfig === 'object') {
              setPillarRitualsConfig({ ...DEFAULT_CRITICAL_RITUALS_BY_PILLAR, ...data.appState.pillarRitualsConfig });
            }
            const defaultVitals: Vitals = (defs as RitualDefinition[]).reduce<Vitals>((acc: Vitals, r: RitualDefinition) => ({ ...acc, [r.id]: false }), {});
            setVitals({ ...defaultVitals, ...(data.appState?.vitals ?? {}) });
            const lt = data.appState?.lifeTracker;
            if (lt?.activeMode === 'focus') {
              setLifeTracker({ ...lt, activeMode: 'passive', stateStartTime: now });
            } else {
              setLifeTracker(lt || { activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 });
            }
            setCompletedBlockIndices(data.appState?.completedBlockIndices ?? []);
            setCurrentBlockIndexState(data.appState?.currentBlockIndex ?? null);
            setCurrentBlockSuggestedMinutes(data.appState?.currentBlockSuggestedMinutes ?? null);
            setRitualNumericValuesState((data.appState?.ritualNumericValues as RitualNumericValues) ?? {});
            setRitualNumericHistory(Array.isArray(data.ritualNumericHistory) ? data.ritualNumericHistory : []);
          } else if (lastErr) {
            console.error('Failed to load from API after retries', lastErr);
            if (typeof window !== 'undefined' && lastErr instanceof TypeError && (lastErr as Error).message?.toLowerCase().includes('fetch')) {
              window.dispatchEvent(new CustomEvent('sovereign:api-offline', { detail: { source: 'initial' } }));
            }
          }
        } catch (e) {
          console.error('Failed to load from API', e);
          if (typeof window !== 'undefined' && e instanceof TypeError && (e as Error).message?.toLowerCase().includes('fetch')) {
            window.dispatchEvent(new CustomEvent('sovereign:api-offline', { detail: { source: 'initial' } }));
          }
        }
        initialLoadFromApiDone.current = true;
      } else {
        setUserId(null);
        const saved = localStorage.getItem('sovereign_v5');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const todayStr = new Date(now).toDateString();
            setAssets((data.assets || []).map((a: Record<string, unknown>) => ({
              ...a,
              targetType: a.targetType ?? 'hours',
              targetAmount: a.targetAmount != null ? Number(a.targetAmount) : undefined,
              investedAmount: a.investedAmount != null ? Number(a.investedAmount) : undefined,
              currency: a.currency ?? undefined,
              parentAssetId: a.parentAssetId ?? undefined,
              stepOrder: a.stepOrder != null ? Number(a.stepOrder) : undefined,
              linkedCapitalAssetId: a.linkedCapitalAssetId ?? undefined,
              targetWeight: a.targetWeight != null ? Number(a.targetWeight) : undefined,
              currentWeight: a.currentWeight != null ? Number(a.currentWeight) : undefined,
              targetUnit: a.targetUnit ?? undefined,
            })));
            setSessionLogs(data.sessionLogs || []);
            setGoalEntries(data.goalEntries || []);
            const defs = (data.ritualDefinitions && Array.isArray(data.ritualDefinitions) && data.ritualDefinitions.length > 0)
              ? data.ritualDefinitions
              : DEFAULT_RITUAL_DEFINITIONS;
            setRitualDefinitions(defs);
            if (data.pillarRitualsConfig && typeof data.pillarRitualsConfig === 'object') {
              setPillarRitualsConfig({ ...DEFAULT_CRITICAL_RITUALS_BY_PILLAR, ...data.pillarRitualsConfig });
            }
            const defaultVitals: Vitals = (defs as RitualDefinition[]).reduce<Vitals>((acc: Vitals, r: RitualDefinition) => ({ ...acc, [r.id]: false }), {});
            setVitals({ ...defaultVitals, ...(data.lastDate === todayStr ? (data.vitals || {}) : {}) });
            if (data.lastDate === todayStr) {
              const restored = data.lifeTracker;
              if (restored?.activeMode === 'focus') {
                setLifeTracker({ ...restored, activeMode: 'passive', stateStartTime: now });
              } else {
                setLifeTracker(restored || { activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 });
              }
              setCompletedBlockIndices(data.completedBlockIndices || []);
              setCurrentBlockIndexState(data.currentBlockIndex ?? null);
              setCurrentBlockSuggestedMinutes(data.currentBlockSuggestedMinutes ?? null);
              setRitualNumericValuesState((data.ritualNumericValues as RitualNumericValues) || {});
            } else {
              setLifeTracker({ activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 });
              setCompletedBlockIndices([]);
              setCurrentBlockIndexState(null);
              setCurrentBlockSuggestedMinutes(null);
              setRitualNumericValuesState({});
            }
          } catch (e) {
            console.error('Storage corrupt', e);
          }
        }
      }
      setIsHydrated(true);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated || !userId || !initialLoadFromApiDone.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      const payload = {
        assets,
        sessionLogs,
        goalEntries,
        lifeTracker,
        vitals,
        ritualNumericValues,
        ritualDefinitions,
        lastDate: new Date().toDateString(),
        completedBlockIndices,
        currentBlockIndex,
        currentBlockSuggestedMinutes,
        pillarRitualsConfig,
      };
      fetch('/api/me/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => {
        console.error('Sync failed', e);
        if (typeof window !== 'undefined' && e instanceof TypeError && (e as Error).message?.toLowerCase().includes('fetch')) {
          window.dispatchEvent(new CustomEvent('sovereign:api-offline', { detail: { source: 'sync' } }));
        }
      });
    }, 1500);
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [isHydrated, userId, assets, sessionLogs, goalEntries, lifeTracker, vitals, ritualNumericValues, ritualDefinitions, completedBlockIndices, currentBlockIndex, currentBlockSuggestedMinutes, pillarRitualsConfig]);

  useEffect(() => {
    if (!isHydrated || userId) return;
    const data = {
      assets,
      sessionLogs,
      goalEntries,
      lifeTracker,
      vitals,
      ritualNumericValues,
      ritualDefinitions,
      lastDate: new Date().toDateString(),
      completedBlockIndices,
      currentBlockIndex,
      currentBlockSuggestedMinutes,
      pillarRitualsConfig
    };
    localStorage.setItem('sovereign_v5', JSON.stringify(data));
  }, [assets, sessionLogs, goalEntries, lifeTracker, vitals, ritualNumericValues, ritualDefinitions, isHydrated, userId, completedBlockIndices, currentBlockIndex, currentBlockSuggestedMinutes, pillarRitualsConfig]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dailyStats = useMemo(() => {
    if (!isHydrated) return { focus: 0 };
    const activeSecs = lifeTracker.activeMode === 'focus' 
      ? Math.max(0, Math.floor((currentTime - lifeTracker.stateStartTime) / 1000))
      : 0;
    return {
      focus: lifeTracker.todayFocusSecs + activeSecs,
    };
  }, [lifeTracker, currentTime, isHydrated]);

  const currentVitality = useMemo(() => {
    if (ritualDefinitions.length === 0) return 0;
    const active = ritualDefinitions.filter((r) => {
      if ((r as RitualDefinition).type === 'number') return ritualNumericValues[r.id] != null;
      return vitals[r.id];
    }).length;
    return Math.round((active / ritualDefinitions.length) * 10);
  }, [vitals, ritualNumericValues, ritualDefinitions]);

  const assetAnalytics = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !isHydrated) return { dailyRequired: 0, initialDailyRequired: 0, urgencyFactor: 1, debtHours: 0, status: 'on-track' as const };

    if (asset.targetType === 'money') {
      return { dailyRequired: 0, initialDailyRequired: 0, urgencyFactor: 1, debtHours: 0, status: 'on-track' as const };
    }

    const totalDays = asset.horizonYears * 365;
    const createdAt = new Date(asset.createdAt);
    const daysPassed = Math.max(0, Math.floor((currentTime - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(1, totalDays - daysPassed);

    const initialDailyRequired = asset.targetHours / totalDays;
    const expectedInvestmentAtNow = initialDailyRequired * daysPassed;
    const debtHours = Math.max(0, expectedInvestmentAtNow - asset.investedHours);

    const remainingToTarget = Math.max(0, asset.targetHours - asset.investedHours);
    const dailyRequired = remainingToTarget / daysRemaining;

    const urgencyFactor = dailyRequired / (initialDailyRequired || 0.1);
    
    let status: 'on-track' | 'behind' | 'critical' = 'on-track';
    if (urgencyFactor > 1.4) status = 'critical';
    else if (urgencyFactor > 1.1) status = 'behind';

    return { dailyRequired, initialDailyRequired, urgencyFactor, debtHours, status };
  }, [assets, isHydrated, currentTime]);

  const dailyTargetHours = useMemo(() => {
    return assets.reduce((acc, a) => acc + assetAnalytics(a.id).dailyRequired, 0);
  }, [assets, isHydrated, currentTime]);

  const netInvestableWindow = useMemo(() => {
    const now = new Date(currentTime);
    const endOfDay = new Date(currentTime);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.max(0.1, (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
  }, [currentTime]);

  const intensityRequired = useMemo(() => {
    if (!isHydrated || netInvestableWindow <= 0) return 0;
    const focusLoggedTodayHours = dailyStats.focus / 3600;
    const remainingWorkToday = Math.max(0, dailyTargetHours - focusLoggedTodayHours);
    return remainingWorkToday / netInvestableWindow;
  }, [dailyStats.focus, dailyTargetHours, netInvestableWindow, isHydrated]);

  const isCritical = useMemo(
    () => intensityRequired >= CRITICAL_PRESSURE_THRESHOLD,
    [intensityRequired]
  );

  const isAssetComplete = (asset: Asset): boolean => {
    if ((asset.targetType ?? 'hours') === 'money') {
      const target = asset.targetAmount ?? 0;
      return target > 0 && (asset.investedAmount ?? 0) >= target;
    }
    return asset.targetHours > 0 && asset.investedHours >= asset.targetHours;
  };

  const getNextStepInPath = (category: Pillar): Asset | null => {
    const hoursAssets = assets.filter(
      (a) => a.category === category && (a.targetType ?? 'hours') === 'hours' && a.investedHours < a.targetHours
    );
    const eligible = hoursAssets.filter((a) => {
      if (!a.parentAssetId) return true;
      const parent = assets.find((p) => p.id === a.parentAssetId);
      return parent ? isAssetComplete(parent) : true;
    });
    if (eligible.length === 0) return null;
    eligible.sort((a, b) => {
      const parentA = a.parentAssetId ?? a.id;
      const parentB = b.parentAssetId ?? b.id;
      if (parentA !== parentB) return parentA.localeCompare(parentB);
      const orderA = a.stepOrder ?? 0;
      const orderB = b.stepOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const pA = PRIORITY_ORDER.indexOf(a.priority);
      const pB = PRIORITY_ORDER.indexOf(b.priority);
      if (pA !== pB) return pA - pB;
      const anaA = assetAnalytics(a.id);
      const anaB = assetAnalytics(b.id);
      return anaB.urgencyFactor - anaA.urgencyFactor;
    });
    return eligible[0] ?? null;
  };

  const getPriorityAsset = (category: Pillar) => {
    const pathNext = getNextStepInPath(category);
    if (pathNext) return pathNext;
    // Fallback: ALPHA URGENCY (no path or all path steps complete)
    return [...assets]
      .filter(a => a.category === category && (a.targetType ?? 'hours') === 'hours' && a.investedHours < a.targetHours)
      .sort((a, b) => {
        const pA = PRIORITY_ORDER.indexOf(a.priority);
        const pB = PRIORITY_ORDER.indexOf(b.priority);
        if (pA !== pB) return pA - pB;
        const anaA = assetAnalytics(a.id);
        const anaB = assetAnalytics(b.id);
        if (Math.abs(anaA.urgencyFactor - anaB.urgencyFactor) > 0.05) return anaB.urgencyFactor - anaA.urgencyFactor;
        return anaB.debtHours - anaA.debtHours;
      })[0] || null;
  };

  const getCriticalAsset = () => {
    const hoursAssets = assets.filter(a => (a.targetType ?? 'hours') === 'hours');
    if (hoursAssets.length === 0) return null;
    return [...hoursAssets].sort((a, b) => {
      const pA = PRIORITY_ORDER.indexOf(a.priority);
      const pB = PRIORITY_ORDER.indexOf(b.priority);
      if (pA !== pB) return pA - pB;
      const anaA = assetAnalytics(a.id);
      const anaB = assetAnalytics(b.id);
      if (Math.abs(anaB.urgencyFactor - anaA.urgencyFactor) < 0.05) return b.targetHours - a.targetHours;
      return anaB.urgencyFactor - anaA.urgencyFactor;
    })[0] ?? null;
  };

  const setActiveAssetId = (assetId: string | null) => {
    setLifeTracker(prev => ({ ...prev, activeAssetId: assetId }));
  };

  const addCompletedBlock = (index: number) => {
    setCompletedBlockIndices(prev => (prev.includes(index) ? prev : [...prev, index].sort((a, b) => a - b)));
  };

  const setCurrentBlockIndex = (index: number | null, suggestedMinutes?: number) => {
    setCurrentBlockIndexState(index);
    setCurrentBlockSuggestedMinutes(index !== null && suggestedMinutes != null ? suggestedMinutes : null);
  };

  const toggleFocus = (assetId: string | null = null) => {
    const now = Date.now();
    const isStarting = lifeTracker.activeMode === 'passive';
    const timeSpentSecs = Math.max(0, Math.floor((now - lifeTracker.stateStartTime) / 1000));
    
    if (!isStarting) {
      const prevAssetId = lifeTracker.activeAssetId;
      const asset = assets.find(a => a.id === prevAssetId);
      const assetName = asset?.name || 'Unspecified Focus';

      setSessionLogs(prev => [...prev, {
        id: Date.now(),
        assetName,
        assetId: prevAssetId ?? undefined,
        duration: Math.floor(timeSpentSecs / 60),
        timestamp: new Date(lifeTracker.stateStartTime).toISOString(),
        mode: 'focus'
      }]);

      if (prevAssetId && timeSpentSecs > 10) {
        const hoursEarned = timeSpentSecs / 3600;
        setAssets(prev => prev.map(a => a.id === prevAssetId ? {
          ...a, investedHours: a.investedHours + hoursEarned
        } : a));
      }

      const suggestedMin = currentBlockSuggestedMinutes ?? 0;
      const minSecsRequired = Math.floor(suggestedMin * 60);
      if (currentBlockIndex !== null && suggestedMin > 0 && timeSpentSecs >= minSecsRequired) {
        addCompletedBlock(currentBlockIndex);
      }
      if (currentBlockIndex !== null) {
        setCurrentBlockIndexState(null);
        setCurrentBlockSuggestedMinutes(null);
      }

      setLifeTracker(prev => ({
        ...prev,
        activeMode: 'passive',
        activeAssetId: null,
        stateStartTime: now,
        todayFocusSecs: prev.todayFocusSecs + Math.max(0, timeSpentSecs)
      }));
    } else {
      setLifeTracker(prev => ({
        ...prev, activeMode: 'focus', activeAssetId: assetId, stateStartTime: now
      }));
    }
  };

  const addAsset = (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10, moneyGoal?: { targetAmount: number; currency?: string }, pathOptions?: { parentAssetId: string; stepOrder: number }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11);
    const isMoney = moneyGoal != null && moneyGoal.targetAmount > 0;
    setAssets(prev => [...prev, {
      id,
      name, category, priority,
      targetHours: isMoney ? 0 : targetHours,
      investedHours: 0,
      horizonYears,
      dailyTasks: [], createdAt: new Date().toISOString(),
      criticalRituals: DEFAULT_CRITICAL_RITUALS_BY_PILLAR[category],
      ...(isMoney ? { targetType: 'money' as const, targetAmount: moneyGoal.targetAmount, investedAmount: 0, currency: moneyGoal.currency ?? 'EUR' } : { targetType: 'hours' as const }),
      ...(pathOptions ? { parentAssetId: pathOptions.parentAssetId, stepOrder: pathOptions.stepOrder } : {}),
    }]);
  };

  const addAssetWithLinkedCapital = (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10, capitalAmount: number, pathOptions?: { parentAssetId: string; stepOrder: number }, weight?: { targetWeight: number; currentWeight?: number; unit?: string }) => {
    const capId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'cap-' + Math.random().toString(36).slice(2, 11);
    const mainId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11);
    const capitalAsset: Asset = {
      id: capId,
      name: `Savings: ${name}`,
      category: 'capital',
      priority,
      targetHours: 0,
      investedHours: 0,
      horizonYears,
      dailyTasks: [],
      createdAt: new Date().toISOString(),
      criticalRituals: DEFAULT_CRITICAL_RITUALS_BY_PILLAR.capital,
      targetType: 'money',
      targetAmount: capitalAmount,
      investedAmount: 0,
      currency: 'EUR',
    };
    const mainAsset: Asset = {
      id: mainId,
      name,
      category,
      priority,
      targetHours,
      investedHours: 0,
      horizonYears,
      dailyTasks: [],
      createdAt: new Date().toISOString(),
      criticalRituals: DEFAULT_CRITICAL_RITUALS_BY_PILLAR[category],
      targetType: 'hours',
      linkedCapitalAssetId: capId,
      ...(pathOptions ? { parentAssetId: pathOptions.parentAssetId, stepOrder: pathOptions.stepOrder } : {}),
      ...(weight != null ? { targetWeight: weight.targetWeight, currentWeight: weight.currentWeight ?? null, targetUnit: weight.unit ?? null } : {}),
    };
    setAssets(prev => [...prev, capitalAsset, mainAsset]);
  };

  const getMissingCriticalRituals = (asset: Asset | null): string[] => {
    if (!asset) return [];
    const rituals = asset.criticalRituals ?? DEFAULT_CRITICAL_RITUALS_BY_PILLAR[asset.category];
    return rituals.filter((id) => {
      const def = ritualDefinitions.find(r => r.id === id);
      if (def?.type === 'number') return ritualNumericValues[id] == null;
      return !vitals[id];
    });
  };

  const getPillarRituals = (pillar: Pillar): string[] => pillarRitualsConfig[pillar] ?? DEFAULT_CRITICAL_RITUALS_BY_PILLAR[pillar];
  const setPillarRituals = (pillar: Pillar, rituals: string[]) => {
    setPillarRitualsConfig(prev => ({ ...prev, [pillar]: rituals }));
  };
  const updateAssetCriticalRituals = (assetId: string, rituals: string[]) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, criticalRituals: rituals } : a));
  };
  const getDefaultCriticalRitualsForPillar = (pillar: Pillar): string[] => DEFAULT_CRITICAL_RITUALS_BY_PILLAR[pillar];

  const updateAsset = (assetId: string, updates: Partial<Pick<Asset, 'name' | 'category' | 'targetHours' | 'horizonYears' | 'priority' | 'targetAmount' | 'currency' | 'parentAssetId' | 'stepOrder' | 'linkedCapitalAssetId' | 'targetWeight' | 'currentWeight' | 'targetUnit'>>) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updates } : a));
  };

  const getGoalEntriesForAsset = (assetId: string) =>
    [...goalEntries].filter(e => e.assetId === assetId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const addGoalEntry = (assetId: string, amount: number, note?: string | null) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || amount <= 0) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11);
    const entry: GoalEntry = {
      id,
      assetId,
      amount,
      currency: asset.currency ?? 'EUR',
      timestamp: new Date().toISOString(),
      note: note ?? null,
    };
    setGoalEntries(prev => [...prev, entry]);
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, investedAmount: (a.investedAmount ?? 0) + amount } : a));
  };

  const deleteGoalEntry = (id: string) => {
    const entry = goalEntries.find(e => e.id === id);
    if (!entry) return;
    setGoalEntries(prev => prev.filter(e => e.id !== id));
    setAssets(prev => prev.map(a => a.id === entry.assetId ? { ...a, investedAmount: Math.max(0, (a.investedAmount ?? 0) - entry.amount) } : a));
  };

  const addRitual = (def: RitualDefinition) => {
    if (ritualDefinitions.some((r) => r.id === def.id)) return;
    setRitualDefinitions(prev => [...prev, def]);
    setVitals(prev => ({ ...prev, [def.id]: false }));
  };

  const setRitualNumericValue = (ritualId: string, value: number | null) => {
    setRitualNumericValuesState(prev => {
      const next = { ...prev };
      if (value == null) delete next[ritualId];
      else next[ritualId] = value;
      return next;
    });
  };

  const deleteRitual = (id: string) => {
    if (ritualDefinitions.length <= 1) return;
    setRitualDefinitions(prev => prev.filter((r) => r.id !== id));
    setVitals(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRitualNumericValuesState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPillarRitualsConfig(prev => {
      const next = { ...prev };
      (Object.keys(next) as Pillar[]).forEach((p) => {
        next[p] = (next[p] || []).filter((r) => r !== id);
      });
      return next;
    });
    setAssets(prev => prev.map((a) => ({
      ...a,
      criticalRituals: (a.criticalRituals || []).filter((r) => r !== id),
    })));
  };

  const deleteAsset = (id: string) => setAssets(prev => prev.filter(a => a.id !== id));
  
  const toggleTask = (assetId: string, taskId: string) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, dailyTasks: a.dailyTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } : a));
  };
  
  const updateAssetTasks = (assetId: string, tasks: { title: string, priority: Priority }[]) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, dailyTasks: tasks.map(t => ({ id: Math.random().toString(36).substr(2, 9), title: t.title, priority: t.priority, completed: false })) } : a));
  };

  const toggleVital = (key: string) => {
    setVitals(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalInvestment = useMemo(() => assets.reduce((acc, a) => acc + (a.investedHours || 0), 0), [assets]);

  return (
    <AssetStoreContext.Provider value={{
      assets, goalEntries, addGoalEntry, deleteGoalEntry, getGoalEntriesForAsset,
      lifeTracker, sessionLogs, totalInvestment, dailyTargetHours, isHydrated, vitals,
      ritualNumericValues, ritualNumericHistory, setRitualNumericValue,
      ritualDefinitions, addRitual, deleteRitual,
      addAsset, addAssetWithLinkedCapital, deleteAsset, toggleFocus, updateAssetTasks, toggleTask, toggleVital, dailyStats,
      intensityRequired, isCritical, netInvestableWindow, remainingCycleHours: netInvestableWindow,
      currentVitality, assetAnalytics, getPriorityAsset, getNextStepInPath, isAssetComplete,
      completedBlockIndices, currentBlockIndex, setCurrentBlockIndex, addCompletedBlock, setActiveAssetId, getCriticalAsset,
      currentTime,
      getMissingCriticalRituals,
      getPillarRituals,
      setPillarRituals,
      updateAssetCriticalRituals,
      getDefaultCriticalRitualsForPillar,
      updateAsset
    }}>
      {children}
    </AssetStoreContext.Provider>
  );
}

export function useFoco() {
  const context = useContext(AssetStoreContext);
  if (context === undefined) return getDefaultFocoContext();
  return context;
}
