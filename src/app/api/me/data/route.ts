import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type AssetLike = {
  id: string;
  targetHours: number;
  investedHours: number;
  horizonYears: number;
  createdAt?: string;
  category: string;
  targetType?: string;
  targetAmount?: number;
  investedAmount?: number;
  parentAssetId?: string;
  priority: string;
};
type LogLike = { assetId?: string; duration: number; timestamp: string; mode: string };

const PRIORITY_ORDER = ['high', 'medium', 'low'];
const PILLAR_ORDER = ['professional', 'personal', 'vitality', 'capital'] as const;

function computeDailyTargetHoursForDate(
  dateStr: string,
  assets: AssetLike[],
  sessionLogs: LogLike[]
): number {
  const endOfDate = new Date(dateStr);
  endOfDate.setHours(23, 59, 59, 999);
  const endTime = endOfDate.getTime();

  const getInvestedAsOf = (assetId: string) =>
    sessionLogs
      .filter(
        (l) =>
          l.mode === 'focus' &&
          l.assetId === assetId &&
          new Date(l.timestamp).getTime() <= endTime
      )
      .reduce((acc, l) => acc + l.duration / 60, 0);

  const analyticsFor = (asset: AssetLike) => {
    if ((asset.targetType ?? 'hours') === 'money') return { dailyRequired: 0 };
    const totalDays = asset.horizonYears * 365;
    const createdAt = new Date(asset.createdAt ?? 0).getTime();
    const daysPassed = Math.max(0, Math.floor((endTime - createdAt) / (24 * 60 * 60 * 1000)));
    const daysRemaining = Math.max(1, totalDays - daysPassed);
    const investedAsOf = getInvestedAsOf(asset.id);
    const remaining = Math.max(0, asset.targetHours - investedAsOf);
    return { dailyRequired: remaining / daysRemaining };
  };

  const isCompleteAsOf = (asset: AssetLike) => {
    if ((asset.targetType ?? 'hours') === 'money')
      return (asset.investedAmount ?? 0) >= (asset.targetAmount ?? 0);
    return getInvestedAsOf(asset.id) >= asset.targetHours;
  };

  const getPriorityAssetForPillar = (category: string): AssetLike | null => {
    const hoursAssets = assets.filter(
      (a) =>
        a.category === category &&
        (a.targetType ?? 'hours') === 'hours' &&
        !isCompleteAsOf(a)
    );
    if (hoursAssets.length === 0) return null;
    const eligible = hoursAssets.filter((a) => {
      if (!a.parentAssetId) return true;
      const parent = assets.find((p) => p.id === a.parentAssetId);
      return parent ? isCompleteAsOf(parent) : true;
    });
    eligible.sort((a, b) => {
      const pA = PRIORITY_ORDER.indexOf(a.priority);
      const pB = PRIORITY_ORDER.indexOf(b.priority);
      if (pA !== pB) return pA - pB;
      const anaA = analyticsFor(a);
      const anaB = analyticsFor(b);
      return anaB.dailyRequired - anaA.dailyRequired;
    });
    return eligible[0] ?? null;
  };

  let total = 0;
  for (const pillar of PILLAR_ORDER) {
    const a = getPriorityAssetForPillar(pillar);
    if (a) total += analyticsFor(a).dailyRequired;
  }
  return total;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const lastDate = searchParams.get('date') ?? new Date().toDateString();

  const [assetsRes, logsRes, entriesRes, stateRes, historyRes, latestStateRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('session_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: true }),
    supabase.from('goal_entries').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }),
    supabase.from('app_state').select('*').eq('user_id', user.id).eq('last_date', lastDate).maybeSingle(),
    supabase.from('ritual_numeric_history').select('ritual_id, date, value').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('app_state').select('last_date').eq('user_id', user.id).order('last_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (assetsRes.error) return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });
  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
  if (entriesRes.error) return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
  if (stateRes.error) return NextResponse.json({ error: stateRes.error.message }, { status: 500 });
  if (historyRes.error) return NextResponse.json({ error: historyRes.error.message }, { status: 500 });
  const latestAppStateDate = latestStateRes.data?.last_date ?? null;

  const normalizeHorizon = (v: unknown): 1 | 5 | 10 => {
    const n = Number(v);
    if (n === 5 || n === 10) return n;
    return 1;
  };
  const assets = (assetsRes.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priority: row.priority,
    targetHours: Number(row.target_hours),
    investedHours: Number(row.invested_hours),
    horizonYears: normalizeHorizon(row.horizon_years),
    dailyTasks: Array.isArray(row.daily_tasks) ? row.daily_tasks : [],
    createdAt: row.created_at,
    criticalRituals: Array.isArray(row.critical_rituals) ? row.critical_rituals : [],
    targetType: row.target_type ?? 'hours',
    targetAmount: row.target_amount != null ? Number(row.target_amount) : undefined,
    investedAmount: row.invested_amount != null ? Number(row.invested_amount) : undefined,
    currency: row.currency ?? undefined,
    parentAssetId: row.parent_asset_id ?? undefined,
    stepOrder: row.step_order != null ? Number(row.step_order) : undefined,
    linkedCapitalAssetId: row.linked_capital_asset_id ?? undefined,
    targetWeight: row.target_weight != null ? Number(row.target_weight) : undefined,
    currentWeight: row.current_weight != null ? Number(row.current_weight) : undefined,
    targetUnit: row.target_unit ?? undefined,
  }));

  const goalEntries = (entriesRes.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    assetId: row.asset_id,
    amount: Number(row.amount),
    currency: row.currency ?? 'EUR',
    timestamp: row.timestamp,
    note: row.note ?? null,
  }));

  const sessionLogs = (logsRes.data ?? []).map((row) => ({
    id: Number(row.id),
    assetName: row.asset_name,
    assetId: row.asset_id ?? undefined,
    duration: row.duration_min,
    timestamp: row.timestamp,
    mode: row.mode,
  }));

  const row = stateRes.data;
  const appState = row
    ? {
        vitals: (row.vitals as Record<string, boolean>) ?? {},
        playbookRitualsCompleted: (row.playbook_rituals_completed as Record<string, boolean>) ?? {},
        lifeTracker: (row.life_tracker as object) ?? {},
        ritualDefinitions: row.ritual_definitions ?? undefined,
        pillarRitualsConfig: (row.pillar_rituals_config as Record<string, string[]>) ?? {},
        completedBlockIndices: Array.isArray(row.completed_block_indices) ? row.completed_block_indices : [],
        currentBlockIndex: row.current_block_index ?? null,
        currentBlockSuggestedMinutes: row.current_block_suggested_minutes ?? null,
        ritualNumericValues: (row.ritual_numeric_values as Record<string, number>) ?? {},
      }
    : null;

  const ritualNumericHistory = (historyRes.data ?? []).map((row: { ritual_id: string; date: string; value: number }) => ({
    ritualId: row.ritual_id,
    date: row.date,
    value: Number(row.value),
  }));

  if (
    latestAppStateDate &&
    new Date(latestAppStateDate).getTime() < new Date(lastDate).getTime()
  ) {
    const snapRes = await supabase
      .from('daily_snapshots')
      .select('date')
      .eq('user_id', user.id)
      .eq('date', latestAppStateDate)
      .maybeSingle();
    const hasSnapshot = snapRes.data != null;
    if (!hasSnapshot) {
      const prevStateRes = await supabase
        .from('app_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('last_date', latestAppStateDate)
        .maybeSingle();
      const prevRow = prevStateRes.data;
      const focusHours = (sessionLogs ?? [])
        .filter(
          (log) =>
            log.mode === 'focus' &&
            new Date(log.timestamp).toDateString() === latestAppStateDate
        )
        .reduce((acc, log) => acc + log.duration / 60, 0);
      const ritualDefs = Array.isArray(prevRow?.ritual_definitions) && (prevRow?.ritual_definitions as unknown[]).length > 0
        ? (prevRow.ritual_definitions as Array<{ id: string; type?: string }>)
        : [];
      const prevVitals = (prevRow?.vitals as Record<string, boolean>) ?? (prevRow?.playbook_rituals_completed as Record<string, boolean>) ?? {};
      const numeric = (prevRow?.ritual_numeric_values as Record<string, number>) ?? {};
      const active = ritualDefs.filter((r) =>
        r.type === 'number' ? numeric[r.id] != null : prevVitals[r.id]
      ).length;
      const integrity = ritualDefs.length === 0 ? 0 : Math.round((active / ritualDefs.length) * 10);
      const assetLike: AssetLike[] = assets.map((a) => ({
        id: a.id,
        targetHours: a.targetHours,
        investedHours: a.investedHours,
        horizonYears: a.horizonYears,
        createdAt: a.createdAt,
        category: a.category,
        targetType: a.targetType,
        targetAmount: a.targetAmount,
        investedAmount: a.investedAmount,
        parentAssetId: a.parentAssetId,
        priority: a.priority,
      }));
      const targetHours = computeDailyTargetHoursForDate(latestAppStateDate, assetLike, sessionLogs);
      const objectivesMet = focusHours >= targetHours;
      await supabase.from('daily_snapshots').upsert(
        {
          user_id: user.id,
          date: latestAppStateDate,
          focus_hours: Math.max(0, focusHours),
          integrity: Math.min(10, Math.max(0, integrity)),
          target_hours: Math.max(0, targetHours),
          objectives_met: Boolean(objectivesMet),
        },
        { onConflict: 'user_id,date' }
      );
    }
  }

  return NextResponse.json({
    assets,
    sessionLogs,
    goalEntries,
    appState,
    ritualNumericHistory,
    lastDate,
    latestAppStateDate,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    assets?: Array<{
      id?: string;
      name: string;
      category: string;
      priority: string;
      targetHours: number;
      investedHours: number;
      horizonYears: number;
      dailyTasks: unknown[];
      createdAt?: string;
      criticalRituals?: string[];
      targetType?: string;
      targetAmount?: number;
      investedAmount?: number;
      currency?: string;
      parentAssetId?: string | null;
      stepOrder?: number | null;
      linkedCapitalAssetId?: string | null;
      targetWeight?: number | null;
      currentWeight?: number | null;
      targetUnit?: string | null;
    }>;
    sessionLogs?: Array<{
      id?: number;
      assetName: string;
      assetId?: string;
      duration: number;
      timestamp: string;
      mode: string;
    }>;
    goalEntries?: Array<{
      id: string;
      assetId: string;
      amount: number;
      currency: string;
      timestamp: string;
      note?: string | null;
    }>;
    lifeTracker?: object;
    vitals?: Record<string, boolean>;
    playbookRitualsCompleted?: Record<string, boolean>;
    ritualNumericValues?: Record<string, number>;
    ritualDefinitions?: unknown[];
    lastDate?: string;
    completedBlockIndices?: number[];
    currentBlockIndex?: number | null;
    currentBlockSuggestedMinutes?: number | null;
    pillarRitualsConfig?: Record<string, string[]>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lastDate = body.lastDate ?? new Date().toDateString();

  if (body.assets) {
    const { error: delErr } = await supabase.from('assets').delete().eq('user_id', user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    if (body.assets.length > 0) {
      const rows = body.assets.map((a) => ({
        id: a.id ?? crypto.randomUUID(),
        user_id: user.id,
        name: a.name,
        category: a.category,
        priority: a.priority,
        target_hours: a.targetHours ?? 0,
        invested_hours: a.investedHours ?? 0,
        horizon_years: a.horizonYears,
        daily_tasks: a.dailyTasks ?? [],
        critical_rituals: a.criticalRituals ?? [],
        created_at: a.createdAt ?? new Date().toISOString(),
        target_type: a.targetType ?? 'hours',
        target_amount: a.targetAmount ?? null,
        invested_amount: a.investedAmount ?? 0,
        currency: a.currency ?? 'EUR',
        parent_asset_id: a.parentAssetId ?? null,
        step_order: a.stepOrder ?? null,
        linked_capital_asset_id: a.linkedCapitalAssetId ?? null,
        target_weight: a.targetWeight ?? null,
        current_weight: a.currentWeight ?? null,
        target_unit: a.targetUnit ?? null,
      }));
      const { error: insErr } = await supabase.from('assets').insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  if (body.goalEntries) {
    const { error: delErr } = await supabase.from('goal_entries').delete().eq('user_id', user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    if (body.goalEntries.length > 0) {
      const rows = body.goalEntries.map((e) => ({
        id: e.id,
        user_id: user.id,
        asset_id: e.assetId,
        amount: e.amount,
        currency: e.currency ?? 'EUR',
        timestamp: e.timestamp,
        note: e.note ?? null,
      }));
      const { error: insErr } = await supabase.from('goal_entries').insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  if (body.sessionLogs) {
    const { error: delErr } = await supabase.from('session_logs').delete().eq('user_id', user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    if (body.sessionLogs.length > 0) {
      const rows = body.sessionLogs.map((log) => ({
        user_id: user.id,
        asset_id: log.assetId || null,
        asset_name: log.assetName,
        duration_min: log.duration,
        timestamp: log.timestamp,
        mode: log.mode,
      }));
      const { error: insErr } = await supabase.from('session_logs').insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

    if (body.lastDate !== undefined) {
    const { error: upsertErr } = await supabase.from('app_state').upsert(
      {
        user_id: user.id,
        last_date: lastDate,
        vitals: body.vitals ?? body.playbookRitualsCompleted ?? {},
        playbook_rituals_completed: body.vitals ?? body.playbookRitualsCompleted ?? {},
        life_tracker: body.lifeTracker ?? {},
        ritual_definitions: body.ritualDefinitions ?? null,
        pillar_rituals_config: body.pillarRitualsConfig ?? {},
        ritual_numeric_values: body.ritualNumericValues ?? {},
        completed_block_indices: body.completedBlockIndices ?? [],
        current_block_index: body.currentBlockIndex ?? null,
        current_block_suggested_minutes: body.currentBlockSuggestedMinutes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,last_date' }
    );
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Persist today's numeric values into ritual_numeric_history for time series
    const numericValues = body.ritualNumericValues ?? {};
    if (Object.keys(numericValues).length > 0) {
      const historyRows = Object.entries(numericValues).map(([ritual_id, value]) => ({
        user_id: user.id,
        ritual_id,
        date: lastDate,
        value: Number(value),
      }));
      const { error: histErr } = await supabase.from('ritual_numeric_history').upsert(historyRows, { onConflict: 'user_id,ritual_id,date' });
      if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
