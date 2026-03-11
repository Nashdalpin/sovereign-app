import { createClient, createClientWithToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type DailyTaskRow = { id: string; title: string; completed: boolean; priority?: string };

async function getSupabaseAndUser(request: Request) {
  const supabaseCookie = await createClient();
  const { data: { user }, error: cookieError } = await supabaseCookie.auth.getUser();
  if (!cookieError && user) return { supabase: supabaseCookie, user };

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return { supabase: null, user: null };

  const supabaseToken = createClientWithToken(token);
  const { data: { user: tokenUser }, error: tokenError } = await supabaseToken.auth.getUser(token);
  if (tokenError || !tokenUser) return { supabase: null, user: null };
  return { supabase: supabaseToken, user: tokenUser };
}

export async function GET(request: Request) {
  const { supabase, user } = await getSupabaseAndUser(request);
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dateStr = new Date().toDateString();
  const [assetsRes, stateRes] = await Promise.all([
    supabase.from('assets').select('id, name, daily_tasks').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('app_state').select('life_tracker').eq('user_id', user.id).eq('last_date', dateStr).maybeSingle(),
  ]);

  if (assetsRes.error) return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });
  if (stateRes.error) return NextResponse.json({ error: stateRes.error.message }, { status: 500 });

  const assets = assetsRes.data ?? [];
  const lifeTracker = (stateRes.data?.life_tracker as { activeMode?: string; activeAssetId?: string | null; stateStartTime?: number }) ?? {};
  const focusActive = lifeTracker.activeMode === 'focus';
  const activeAssetId = lifeTracker.activeAssetId ?? null;
  const stateStartTime = typeof lifeTracker.stateStartTime === 'number' ? lifeTracker.stateStartTime : Date.now();

  const activeAsset = assets.find((a: { id: string }) => a.id === activeAssetId);
  const activeMandateName = activeAsset?.name ?? null;

  const todayTasks: { id: string; title: string; completed: boolean; assetId: string }[] = [];
  assets.forEach((a: { id: string; daily_tasks?: DailyTaskRow[] }) => {
    const tasks = Array.isArray(a.daily_tasks) ? a.daily_tasks : [];
    tasks.forEach((t: DailyTaskRow) => {
      todayTasks.push({
        id: t.id,
        title: t.title ?? '',
        completed: !!t.completed,
        assetId: a.id,
      });
    });
  });

  const done = todayTasks.filter((t) => t.completed).length;
  const total = todayTasks.length;
  const tasksPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return NextResponse.json({
    focusActive,
    focusStartedAt: focusActive ? stateStartTime : null,
    activeMandateName,
    todayTasks,
    tasksProgress: { done, total },
    tasksPercentage,
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getSupabaseAndUser(request);
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { assetId?: string; taskId?: string; completed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { assetId, taskId, completed } = body;
  if (!assetId || !taskId || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'assetId, taskId and completed required' }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from('assets')
    .select('daily_tasks')
    .eq('user_id', user.id)
    .eq('id', assetId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const dailyTasks = Array.isArray(row.daily_tasks) ? row.daily_tasks : [];
  const updated = dailyTasks.map((t: { id?: string; title?: string; completed?: boolean; priority?: string }) =>
    t.id === taskId ? { ...t, completed } : t
  );
  const found = updated.some((t: { id?: string }) => t.id === taskId);
  if (!found) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from('assets')
    .update({ daily_tasks: updated })
    .eq('user_id', user.id)
    .eq('id', assetId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
