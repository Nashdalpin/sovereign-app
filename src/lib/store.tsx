
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
};

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
};

/** Daily state per ritual (id -> checked or not). Keys come from ritualDefinitions. */
export type Vitals = Record<string, boolean>;

interface AssetStoreContextType {
  assets: Asset[];
  lifeTracker: {
    activeMode: LifeMode;
    activeAssetId: string | null;
    stateStartTime: number;
    todayFocusSecs: number;
  };
  vitals: Vitals;
  ritualDefinitions: RitualDefinition[];
  addRitual: (def: RitualDefinition) => void;
  deleteRitual: (id: string) => void;
  sessionLogs: SessionLog[];
  totalInvestment: number;
  dailyTargetHours: number;
  isHydrated: boolean;
  addAsset: (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10) => void;
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
  updateAsset: (assetId: string, updates: Partial<Pick<Asset, 'targetHours' | 'horizonYears' | 'priority'>>) => void;
}

const AssetStoreContext = createContext<AssetStoreContextType | undefined>(undefined);

/** Fallback when context is undefined (e.g. SSR duplicate module) so useFoco() does not throw and cause HTTP 500. */
function getDefaultFocoContext(): AssetStoreContextType {
  const noop = () => {};
  const now = Date.now();
  return {
    assets: [],
    lifeTracker: { activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 },
    vitals: {},
    ritualDefinitions: DEFAULT_RITUAL_DEFINITIONS,
    addRitual: noop,
    deleteRitual: noop,
    sessionLogs: [],
    totalInvestment: 0,
    dailyTargetHours: 0,
    isHydrated: false,
    addAsset: noop,
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
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [completedBlockIndices, setCompletedBlockIndices] = useState<number[]>([]);
  const [currentBlockIndex, setCurrentBlockIndexState] = useState<number | null>(null);
  const [currentBlockSuggestedMinutes, setCurrentBlockSuggestedMinutes] = useState<number | null>(null);
  const [pillarRitualsConfig, setPillarRitualsConfig] = useState<Record<Pillar, string[]>>(DEFAULT_CRITICAL_RITUALS_BY_PILLAR);
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
        try {
          const res = await fetch(`/api/me/data?date=${encodeURIComponent(new Date().toDateString())}`);
          if (res.ok) {
            const data = await res.json();
            setAssets(data.assets ?? []);
            setSessionLogs(data.sessionLogs ?? []);
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
          }
        } catch (e) {
          console.error('Failed to load from API', e);
        }
        initialLoadFromApiDone.current = true;
      } else {
        setUserId(null);
        const saved = localStorage.getItem('sovereign_v5');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const todayStr = new Date(now).toDateString();
            setAssets(data.assets || []);
            setSessionLogs(data.sessionLogs || []);
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
            } else {
              setLifeTracker({ activeMode: 'passive', activeAssetId: null, stateStartTime: now, todayFocusSecs: 0 });
              setCompletedBlockIndices([]);
              setCurrentBlockIndexState(null);
              setCurrentBlockSuggestedMinutes(null);
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
        lifeTracker,
        vitals,
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
      }).catch((e) => console.error('Sync failed', e));
    }, 1500);
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [isHydrated, userId, assets, sessionLogs, lifeTracker, vitals, ritualDefinitions, completedBlockIndices, currentBlockIndex, currentBlockSuggestedMinutes, pillarRitualsConfig]);

  useEffect(() => {
    if (!isHydrated || userId) return;
    const data = {
      assets,
      sessionLogs,
      lifeTracker,
      vitals,
      ritualDefinitions,
      lastDate: new Date().toDateString(),
      completedBlockIndices,
      currentBlockIndex,
      currentBlockSuggestedMinutes,
      pillarRitualsConfig
    };
    localStorage.setItem('sovereign_v5', JSON.stringify(data));
  }, [assets, sessionLogs, lifeTracker, vitals, ritualDefinitions, isHydrated, userId, completedBlockIndices, currentBlockIndex, currentBlockSuggestedMinutes, pillarRitualsConfig]);

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
    const active = ritualDefinitions.filter((r) => vitals[r.id]).length;
    return Math.round((active / ritualDefinitions.length) * 10);
  }, [vitals, ritualDefinitions]);

  const assetAnalytics = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !isHydrated) return { dailyRequired: 0, initialDailyRequired: 0, urgencyFactor: 1, debtHours: 0, status: 'on-track' as const };

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

  const getPriorityAsset = (category: Pillar) => {
    // ALPHA URGENCY LOGIC:
    // 1. User priority (High > Medium > Low)
    // 2. Urgency factor (the more behind, the more focus)
    // 3. Strategic debt in hours (whales before small fish)
    return [...assets]
      .filter(a => a.category === category && a.investedHours < a.targetHours)
      .sort((a, b) => {
        const pA = PRIORITY_ORDER.indexOf(a.priority);
        const pB = PRIORITY_ORDER.indexOf(b.priority);
        if (pA !== pB) return pA - pB;

        const anaA = assetAnalytics(a.id);
        const anaB = assetAnalytics(b.id);
        
        if (Math.abs(anaA.urgencyFactor - anaB.urgencyFactor) > 0.05) {
          return anaB.urgencyFactor - anaA.urgencyFactor;
        }

        return anaB.debtHours - anaA.debtHours;
      })[0] || null;
  };

  const getCriticalAsset = () => {
    if (assets.length === 0) return null;
    return [...assets].sort((a, b) => {
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

  const addAsset = (name: string, category: Pillar, priority: Priority, targetHours: number, horizonYears: 1 | 5 | 10) => {
    setAssets(prev => [...prev, {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
      name, category, priority, targetHours, horizonYears,
      investedHours: 0, dailyTasks: [], createdAt: new Date().toISOString(),
      criticalRituals: DEFAULT_CRITICAL_RITUALS_BY_PILLAR[category]
    }]);
  };

  const getMissingCriticalRituals = (asset: Asset | null): string[] => {
    if (!asset) return [];
    const rituals = asset.criticalRituals ?? DEFAULT_CRITICAL_RITUALS_BY_PILLAR[asset.category];
    return rituals.filter((id) => !vitals[id]);
  };

  const getPillarRituals = (pillar: Pillar): string[] => pillarRitualsConfig[pillar] ?? DEFAULT_CRITICAL_RITUALS_BY_PILLAR[pillar];
  const setPillarRituals = (pillar: Pillar, rituals: string[]) => {
    setPillarRitualsConfig(prev => ({ ...prev, [pillar]: rituals }));
  };
  const updateAssetCriticalRituals = (assetId: string, rituals: string[]) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, criticalRituals: rituals } : a));
  };
  const getDefaultCriticalRitualsForPillar = (pillar: Pillar): string[] => DEFAULT_CRITICAL_RITUALS_BY_PILLAR[pillar];

  const updateAsset = (assetId: string, updates: Partial<Pick<Asset, 'targetHours' | 'horizonYears' | 'priority'>>) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updates } : a));
  };

  const addRitual = (def: RitualDefinition) => {
    if (ritualDefinitions.some((r) => r.id === def.id)) return;
    setRitualDefinitions(prev => [...prev, def]);
    setVitals(prev => ({ ...prev, [def.id]: false }));
  };

  const deleteRitual = (id: string) => {
    if (ritualDefinitions.length <= 1) return;
    setRitualDefinitions(prev => prev.filter((r) => r.id !== id));
    setVitals(prev => {
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
      assets, lifeTracker, sessionLogs, totalInvestment, dailyTargetHours, isHydrated, vitals,
      ritualDefinitions, addRitual, deleteRitual,
      addAsset, deleteAsset, toggleFocus, updateAssetTasks, toggleTask, toggleVital, dailyStats,
      intensityRequired, isCritical, netInvestableWindow, remainingCycleHours: netInvestableWindow,
      currentVitality, assetAnalytics, getPriorityAsset,
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
