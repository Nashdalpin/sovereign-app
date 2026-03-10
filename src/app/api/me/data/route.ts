import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const lastDate = searchParams.get('date') ?? new Date().toDateString();

  const [assetsRes, logsRes, stateRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('session_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: true }),
    supabase.from('app_state').select('*').eq('user_id', user.id).eq('last_date', lastDate).maybeSingle(),
  ]);

  if (assetsRes.error) return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });
  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
  if (stateRes.error) return NextResponse.json({ error: stateRes.error.message }, { status: 500 });

  const assets = (assetsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priority: row.priority,
    targetHours: Number(row.target_hours),
    investedHours: Number(row.invested_hours),
    horizonYears: row.horizon_years,
    dailyTasks: Array.isArray(row.daily_tasks) ? row.daily_tasks : [],
    createdAt: row.created_at,
    criticalRituals: Array.isArray(row.critical_rituals) ? row.critical_rituals : [],
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
        lifeTracker: (row.life_tracker as object) ?? {},
        ritualDefinitions: row.ritual_definitions ?? undefined,
        pillarRitualsConfig: (row.pillar_rituals_config as Record<string, string[]>) ?? {},
        completedBlockIndices: Array.isArray(row.completed_block_indices) ? row.completed_block_indices : [],
        currentBlockIndex: row.current_block_index ?? null,
        currentBlockSuggestedMinutes: row.current_block_suggested_minutes ?? null,
      }
    : null;

  return NextResponse.json({
    assets,
    sessionLogs,
    appState,
    lastDate,
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
    }>;
    sessionLogs?: Array<{
      id?: number;
      assetName: string;
      assetId?: string;
      duration: number;
      timestamp: string;
      mode: string;
    }>;
    lifeTracker?: object;
    vitals?: Record<string, boolean>;
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
        target_hours: a.targetHours,
        invested_hours: a.investedHours,
        horizon_years: a.horizonYears,
        daily_tasks: a.dailyTasks ?? [],
        critical_rituals: a.criticalRituals ?? [],
        created_at: a.createdAt ?? new Date().toISOString(),
      }));
      const { error: insErr } = await supabase.from('assets').insert(rows);
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
        vitals: body.vitals ?? {},
        life_tracker: body.lifeTracker ?? {},
        ritual_definitions: body.ritualDefinitions ?? null,
        pillar_rituals_config: body.pillarRitualsConfig ?? {},
        completed_block_indices: body.completedBlockIndices ?? [],
        current_block_index: body.currentBlockIndex ?? null,
        current_block_suggested_minutes: body.currentBlockSuggestedMinutes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,last_date' }
    );
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
