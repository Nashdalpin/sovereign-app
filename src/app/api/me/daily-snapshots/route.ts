import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const { data, error } = await supabase
    .from('daily_snapshots')
    .select('date, focus_hours, integrity, target_hours, objectives_met')
    .eq('user_id', user.id)
    .limit(90);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data ?? []) as { date: string; focus_hours: number; integrity: number; target_hours: number; objectives_met: boolean }[];
  rows = rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (fromParam) {
    const fromTime = new Date(fromParam).getTime();
    rows = rows.filter((r) => new Date(r.date).getTime() >= fromTime);
  }
  if (toParam) {
    const toEnd = new Date(toParam);
    toEnd.setHours(23, 59, 59, 999);
    const toTime = toEnd.getTime();
    rows = rows.filter((r) => new Date(r.date).getTime() <= toTime);
  }

  const snapshots = rows.map((row) => ({
    date: row.date,
    focusHours: Number(row.focus_hours),
    integrity: Number(row.integrity),
    targetHours: Number(row.target_hours),
    objectivesMet: Boolean(row.objectives_met),
  }));

  return NextResponse.json({ snapshots });
}
