import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { date: string; focusHours: number; integrity: number; targetHours: number; objectivesMet: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, focusHours, integrity, targetHours, objectivesMet } = body;
  if (typeof date !== 'string' || !date.trim()) {
    return NextResponse.json({ error: 'date required' }, { status: 400 });
  }

  const focus = Number(focusHours);
  const integ = Number(integrity);
  const target = Number(targetHours);
  if (!Number.isFinite(focus) || !Number.isFinite(integ) || !Number.isFinite(target)) {
    return NextResponse.json({ error: 'focusHours, integrity, targetHours must be numbers' }, { status: 400 });
  }

  const { error: upsertErr } = await supabase.from('daily_snapshots').upsert(
    {
      user_id: user.id,
      date: date.trim(),
      focus_hours: Math.max(0, focus),
      integrity: Math.min(10, Math.max(0, Math.round(integ))),
      target_hours: Math.max(0, target),
      objectives_met: Boolean(objectivesMet),
    },
    { onConflict: 'user_id,date' }
  );

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
