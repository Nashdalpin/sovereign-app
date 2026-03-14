"use client"

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFoco, Pillar, SessionLog } from '@/lib/store';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Clock, PieChart, Banknote, Download, ChevronDown, ChevronRight, LayoutGrid, History, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

type PillarHours = Record<Pillar, number>;
type PillarMoney = Record<Pillar, number>;

type DailySnapshot = {
  date: string;
  focusHours: number;
  integrity: number;
  targetHours: number;
  objectivesMet: boolean;
};

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
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [timelineTableOpen, setTimelineTableOpen] = useState(false);
  const [showAllToday, setShowAllToday] = useState(false);
  const TODAY_DISPLAY_LIMIT = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isHydrated) return;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromStr = from.toDateString();
    const toStr = to.toDateString();
    fetch(`/api/me/daily-snapshots?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`)
      .then((res) => (res.ok ? res.json() : { snapshots: [] }))
      .then((data) => setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []))
      .catch(() => setSnapshots([]));
  }, [mounted, isHydrated]);

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

  const pillarMoney = useMemo((): PillarMoney => {
    const out: PillarMoney = { capital: 0, professional: 0, vitality: 0, personal: 0 };
    assets.forEach((a) => {
      if ((a.targetType ?? 'hours') === 'money' && (a.investedAmount ?? 0) > 0) {
        out[a.category] += a.investedAmount ?? 0;
      }
    });
    return out;
  }, [assets]);

  const timelineChartData = useMemo(() => {
    return [...snapshots].reverse().map((s) => ({
      day: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      date: s.date,
      integrity: s.integrity,
      focus: parseFloat(s.focusHours.toFixed(1)),
      target: parseFloat(s.targetHours.toFixed(1)),
    }));
  }, [snapshots]);

  const handleExportPdf = useCallback(() => {
    const snapshotRows = snapshots.map((s) => ({
      date: s.date,
      focusHours: s.focusHours,
      targetHours: s.targetHours,
      objectivesMet: s.objectivesMet,
      integrity: s.integrity,
    }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthLogs = sessionLogs.filter((log) => {
      if (log.mode !== 'focus') return false;
      const ts = new Date(log.timestamp).getTime();
      return ts >= monthStart.getTime() && ts <= monthEnd.getTime();
    });
    const totalMonthHours = monthLogs.reduce((acc, log) => acc + log.duration / 60, 0);
    const assetsById = new Map(assets.map((a) => [a.id, a]));
    const assetsByName = new Map(assets.map((a) => [a.name.toLowerCase(), a]));
    const resolveCategory = (key: string) =>
      assetsById.get(key)?.category ?? assetsByName.get(key.toLowerCase())?.category;
    const monthlyPillarHours: PillarHours = { capital: 0, professional: 0, vitality: 0, personal: 0 };
    monthLogs.forEach((log) => {
      const key = log.assetId ?? log.assetName ?? '';
      const cat = resolveCategory(key);
      if (cat) monthlyPillarHours[cat] += log.duration / 60;
    });

    const nowStr = new Date().toISOString().slice(0, 10);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const docWithTable = doc as unknown as {
      autoTable: (opts: Record<string, unknown>) => void;
      lastAutoTable: { finalY: number };
    };

    const margin = 20;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const sectionGap = 14;
    const safeBottom = pageH - margin - 22;
    const ensureSpace = (requiredMm: number) => {
      if (y + requiredMm > safeBottom) {
        doc.addPage();
        y = margin + 12;
      }
    };
    const gold: [number, number, number] = [168, 132, 58];
    const goldLight: [number, number, number] = [218, 198, 148];
    const goldBg: [number, number, number] = [253, 251, 246];
    const ink: [number, number, number] = [48, 44, 38];
    const inkMuted: [number, number, number] = [115, 105, 92];
    const border: [number, number, number] = [232, 226, 214];
    const rowAlt: [number, number, number] = [250, 248, 244];

    let y = 22;

    doc.setTextColor(...inkMuted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SOVEREIGN', margin, y);
    y += 10;
    doc.setTextColor(...ink);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Ledger Report', margin, y);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 3.5, margin + 42, y + 3.5);
    y += 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...inkMuted);
    doc.text(
      new Date().toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' }),
      margin,
      y
    );
    doc.text('Monthly report · Generated by Sovereign', pageW - margin - doc.getTextWidth('Monthly report · Generated by Sovereign'), y);
    y += 16;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Summary', margin, y);
    doc.setDrawColor(...goldLight);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 1.2, margin + 24, y + 1.2);
    y += 10;

    const summaryBoxH = 26;
    doc.setFillColor(...goldBg);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.12);
    doc.roundedRect(margin, y - 2, pageW - 2 * margin, summaryBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...inkMuted);
    doc.text('Total Equity', margin + 8, y + 7);
    doc.text('Daily Yield', margin + 8, y + 15);
    doc.text('Month', margin + 8, y + 23);
    doc.setTextColor(...ink);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalInvestment.toFixed(1)} h`, pageW - margin - 32, y + 7);
    doc.text(`${(dailyStats.focus / 3600).toFixed(1)} h`, pageW - margin - 32, y + 15);
    doc.text(`${totalMonthHours.toFixed(1)} h`, pageW - margin - 32, y + 23);
    y += summaryBoxH + sectionGap;

    const pillarLabels: Record<Pillar, string> = {
      capital: 'Capital',
      professional: 'Professional',
      vitality: 'Vitality',
      personal: 'Personal',
    };
    const pillarData = (['capital', 'professional', 'vitality', 'personal'] as Pillar[]).map((p) => [
      pillarLabels[p],
      `${monthlyPillarHours[p].toFixed(1)} h`,
      pillarMoney[p] > 0 ? `€ ${pillarMoney[p].toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—',
    ]);
    docWithTable.autoTable({
      head: [['Pillar', 'Hours', 'Invested']],
      body: pillarData,
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fillColor: goldBg,
        textColor: gold,
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 6,
        lineColor: border,
        lineWidth: 0.15,
      },
      bodyStyles: { fontSize: 9, textColor: ink, cellPadding: 5 },
      alternateRowStyles: { fillColor: rowAlt },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
    doc.setDrawColor(...goldLight);
    doc.setLineWidth(0.2);
    doc.line(margin, docWithTable.lastAutoTable.finalY + 1, pageW - margin, docWithTable.lastAutoTable.finalY + 1);
    y = docWithTable.lastAutoTable.finalY + sectionGap;

    const curveBlockH = 14 + 34 + 12;
    ensureSpace(curveBlockH);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Performance Curve', margin, y);
    doc.setDrawColor(...goldLight);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 1.2, margin + 44, y + 1.2);
    y += 12;

    const last30Focus = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toDateString();
      return sessionLogs
        .filter((log) => log.mode === 'focus' && new Date(log.timestamp).toDateString() === dateStr)
        .reduce((acc, log) => acc + log.duration / 60, 0);
    });
    const maxFocus = Math.max(0.1, ...last30Focus);
    const curveW = pageW - 2 * margin - 18;
    const curveH = 34;
    const curveLeft = margin + 12;
    const curveBottom = y + curveH;
    doc.setDrawColor(...border);
    doc.setLineWidth(0.1);
    doc.line(curveLeft, curveBottom, curveLeft + curveW, curveBottom);
    doc.line(curveLeft, y + 2, curveLeft, curveBottom);
    doc.setFontSize(6);
    doc.setTextColor(...inkMuted);
    const barGap = 0.6;
    const barW = (curveW - 4 - 29 * barGap) / 30;
    last30Focus.forEach((h, i) => {
      const barX = curveLeft + 2 + i * (barW + barGap);
      const barH = (h / maxFocus) * (curveH - 6);
      doc.setFillColor(...goldLight);
      doc.rect(barX, curveBottom - barH, barW, barH, 'F');
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.06);
      doc.rect(barX, curveBottom - barH, barW, barH, 'S');
    });
    doc.text('Focus (h) · Last 30 days', margin, y + curveH + 8);
    y += curveH + sectionGap;

    const gridRows = 7;
    const cellSize = 2.4;
    const gap = 0.35;
    const latticeBlockH = 12 + gridRows * (cellSize + gap) - gap + 4 + 10;
    ensureSpace(latticeBlockH);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Presence Lattice', margin, y);
    doc.setDrawColor(...goldLight);
    doc.line(margin, y + 1.2, margin + 40, y + 1.2);
    y += 12;

    const days56 = 56;
    const lattice: { intensity: number }[] = [];
    for (let i = days56 - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayHours = sessionLogs
        .filter((log) => log.mode === 'focus' && new Date(log.timestamp).toDateString() === dateStr)
        .reduce((acc, log) => acc + log.duration / 60, 0);
      let intensity = 0;
      if (dayHours > 0) intensity = 1;
      if (dayHours > 2) intensity = 2;
      if (dayHours > 5) intensity = 3;
      lattice.push({ intensity });
    }
    const gridCols = 8;
    const gridW = gridCols * cellSize + (gridCols - 1) * gap;
    const gridLeft = margin + (pageW - 2 * margin - gridW) / 2;
    doc.setFillColor(...goldBg);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.06);
    doc.roundedRect(gridLeft - 2, y - 2, gridW + 4, gridRows * (cellSize + gap) - gap + 4, 1.5, 1.5, 'FD');
    for (let c = 0; c < gridCols; c++) {
      for (let r = 0; r < gridRows; r++) {
        const idx = c * gridRows + r;
        const cell = lattice[idx];
        const x = gridLeft + c * (cellSize + gap);
        const cellY = y + r * (cellSize + gap);
        if (cell.intensity === 0) doc.setFillColor(248, 246, 240);
        else if (cell.intensity === 1) doc.setFillColor(242, 234, 212);
        else if (cell.intensity === 2) doc.setFillColor(228, 210, 168);
        else doc.setFillColor(...gold);
        doc.rect(x, cellY, cellSize, cellSize, 'F');
        doc.setDrawColor(240, 234, 222);
        doc.setLineWidth(0.04);
        doc.rect(x, cellY, cellSize, cellSize, 'S');
      }
    }
    doc.setFontSize(6);
    doc.setTextColor(...inkMuted);
    doc.text('8-Week Tactical Continuity', pageW / 2, y + gridRows * (cellSize + gap) - gap + 8, { align: 'center' });
    y += gridRows * (cellSize + gap) - gap + sectionGap;

    const chartH = 38;
    const timelineBlockH = 12 + chartH + 8 + 20 + sectionGap;
    ensureSpace(timelineBlockH);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Timeline (Integrity + Objectives)', margin, y);
    doc.setDrawColor(...goldLight);
    doc.line(margin, y + 1.2, margin + 72, y + 1.2);
    y += 12;

    if (snapshotRows.length > 0) {
      const chartData = snapshotRows.slice(-14);
      const chartW = pageW - 2 * margin - 18;
      const barMaxH = 30;
      const n = chartData.length;
      const barW = n > 0 ? (chartW - (n - 1) * 2.5) / n : 0;
      const chartLeft = margin + 14;
      const chartBottom = y + chartH - 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...inkMuted);
      doc.text('Integrity (0–10)', margin, y + 10);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.1);
      doc.line(chartLeft, y + 2, chartLeft, chartBottom);
      doc.line(chartLeft, chartBottom, chartLeft + chartW, chartBottom);
      doc.text('0', chartLeft - 5, chartBottom + 3.5);
      doc.text('10', chartLeft - 5, y + 5);

      chartData.forEach((s, i) => {
        const barX = chartLeft + i * (barW + 2.5);
        const h = (s.integrity / 10) * barMaxH;
        const barY = chartBottom - h;
        if (s.objectivesMet) {
          doc.setFillColor(...goldLight);
          doc.rect(barX, barY, barW, h, 'F');
          doc.setDrawColor(...gold);
        } else {
          doc.setFillColor(245, 242, 236);
          doc.rect(barX, barY, barW, h, 'F');
          doc.setDrawColor(...border);
        }
        doc.setLineWidth(0.08);
        doc.rect(barX, barY, barW, h, 'S');
        const label = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        doc.setFontSize(6);
        doc.setTextColor(...inkMuted);
        doc.text(label, barX + barW / 2, chartBottom + 6, { align: 'center' });
      });

      y = chartBottom + 14;
      doc.setFontSize(7);
      doc.setFillColor(...goldLight);
      doc.rect(margin, y - 2.5, 4, 3.5, 'F');
      doc.setDrawColor(...gold);
      doc.rect(margin, y - 2.5, 4, 3.5, 'S');
      doc.setTextColor(...ink);
      doc.text('Objective met', margin + 8, y + 1);
      doc.setFillColor(245, 242, 236);
      doc.rect(margin + 40, y - 2.5, 4, 3.5, 'F');
      doc.setDrawColor(...border);
      doc.rect(margin + 40, y - 2.5, 4, 3.5, 'S');
      doc.text('Objective not met', margin + 48, y + 1);
      y += sectionGap;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...inkMuted);
      doc.text('No timeline data available.', margin, y + 6);
      y += 14;
    }

    ensureSpace(60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Detailed History', margin, y);
    doc.setDrawColor(...goldLight);
    doc.line(margin, y + 1.2, margin + 44, y + 1.2);
    y += 12;

    if (snapshotRows.length > 0) {
      const snapBody = snapshotRows.slice(0, 18).map((s) => [
        new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        s.focusHours.toFixed(1),
        s.targetHours.toFixed(1),
        s.objectivesMet ? 'Yes' : 'No',
        `${s.integrity}/10`,
      ]);
      docWithTable.autoTable({
        head: [['Date', 'Focus (h)', 'Target (h)', 'Objective', 'Integrity']],
        body: snapBody,
        startY: y,
        margin: { left: margin, right: margin },
        showHead: 'everyPage',
        theme: 'plain',
        headStyles: {
          fillColor: goldBg,
          textColor: gold,
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 5,
          lineColor: border,
          lineWidth: 0.15,
        },
        bodyStyles: { fontSize: 8, textColor: ink, cellPadding: 4 },
        alternateRowStyles: { fillColor: rowAlt },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          4: { halign: 'center' },
        },
      });
      doc.setDrawColor(...goldLight);
      doc.setLineWidth(0.2);
      doc.line(margin, docWithTable.lastAutoTable.finalY + 1, pageW - margin, docWithTable.lastAutoTable.finalY + 1);
      } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...inkMuted);
      doc.text('No snapshots available.', margin, y);
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...goldLight);
      doc.setLineWidth(0.15);
      doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
      doc.setFontSize(6);
      doc.setTextColor(...inkMuted);
      doc.text(
        `Page ${p} of ${totalPages}  ·  Sovereign Ledger`,
        pageW / 2,
        pageH - 9,
        { align: 'center' }
      );
    }

    doc.save(`sovereign-ledger-${nowStr}.pdf`);
  }, [snapshots, sessionLogs, totalInvestment, dailyStats.focus, assets, pillarMoney]);

  if (!mounted || !isHydrated)
    return (
      <div className="page-content h-[60vh] flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-20 animate-pulse">
          Initializing Ledger...
        </p>
      </div>
    );

  return (
    <div className="page-content space-y-8 animate-in fade-in duration-500 pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div className="text-center sm:text-left">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-50">
          Audit Records
        </p>
          <h1 className="text-4xl sm:text-5xl luxury-text mt-0.5">Ledger.</h1>
        </div>
        <div className="flex justify-center sm:justify-end">
            <button
              type="button"
            onClick={handleExportPdf}
            className="min-touch inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-primary/50 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={16} strokeWidth={1.5} />
            Export PDF
            </button>
        </div>
      </header>

      <Tabs defaultValue="resumo" className="w-full">
        <nav className="rounded-full bg-muted/25 dark:bg-white/[0.06] border border-border/50 dark:border-white/10 p-1.5" aria-label="Secções do Ledger">
          <TabsList className="w-full grid grid-cols-3 h-12 rounded-full bg-transparent border-0 p-0 gap-1 min-h-0">
            <TabsTrigger
              value="resumo"
              className={cn(
                'min-touch flex-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] gap-1.5 transition-all duration-200 active:scale-[0.98]',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:opacity-80',
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_2px_12px_hsl(var(--primary)/0.35)]'
              )}
            >
              <LayoutGrid size={16} strokeWidth={2} className="shrink-0" />
              Resumo
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className={cn(
                'min-touch flex-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] gap-1.5 transition-all duration-200 active:scale-[0.98]',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:opacity-80',
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_2px_12px_hsl(var(--primary)/0.35)]'
              )}
            >
              <History size={16} strokeWidth={2} className="shrink-0" />
              Histórico
            </TabsTrigger>
            <TabsTrigger
              value="hoje"
              className={cn(
                'min-touch flex-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] gap-1.5 transition-all duration-200 active:scale-[0.98]',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:opacity-80',
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_2px_12px_hsl(var(--primary)/0.35)]'
              )}
            >
              <Calendar size={16} strokeWidth={2} className="shrink-0" />
              Hoje
            </TabsTrigger>
          </TabsList>
        </nav>

        <TabsContent value="resumo" className="space-y-10 mt-8 animate-in fade-in duration-300">
          <section className="grid grid-cols-2 gap-5">
            <div className="luxury-card p-8 space-y-2 text-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Total Equity</p>
              <p className="text-3xl font-light tracking-tighter tabular-nums leading-none luxury-text">
            {totalInvestment.toFixed(1)}
                <span className="text-xs opacity-20 font-medium ml-1.5 uppercase tracking-[0.4em]">H</span>
          </p>
        </div>
            <div className="luxury-card p-8 space-y-2 text-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Daily Yield</p>
              <p className="text-3xl font-light tracking-tighter tabular-nums leading-none text-primary luxury-text">
            {(dailyStats.focus / 3600).toFixed(1)}
                <span className="text-xs opacity-20 font-medium ml-1.5 uppercase tracking-[0.4em]">H</span>
          </p>
        </div>
      </section>
          <section className="luxury-card p-8 space-y-8 min-h-[200px]">
        <div className="flex justify-between items-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Performance Curve</p>
              <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50 flex items-center gap-1">
                <PieChart size={10} strokeWidth={1.5} />
            {weeklyStats.totalWeekHours.toFixed(1)}h / 7d
          </span>
        </div>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="focus" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorFocus)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
          <section className="luxury-card p-6 space-y-6">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Weekly Pillar Distribution</p>
        <div className="grid grid-cols-2 gap-4">
              {(['capital', 'professional', 'vitality', 'personal'] as Pillar[]).map((pillar) => (
              <div key={pillar} className="space-y-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">{pillar}</p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-light tabular-nums">
                    {weeklyStats.pillarHours[pillar].toFixed(1)}
                    <span className="text-[9px] ml-1 opacity-30">h</span>
                  </p>
                  {pillarMoney[pillar] > 0 && (
                    <p className="text-sm font-light tabular-nums text-primary flex items-center gap-1">
                      <Banknote size={12} className="opacity-70" />
                      {pillarMoney[pillar].toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                      <span className="text-[9px] opacity-30">€</span>
                    </p>
                  )}
                </div>
                <div className="h-1 w-full bg-muted dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 gold-glow"
                    style={{
                        width: `${Math.min(100, (weeklyStats.pillarHours[pillar] / (weeklyStats.totalWeekHours || 1)) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
              ))}
        </div>
      </section>
        </TabsContent>

        <TabsContent value="historico" className="space-y-10 mt-8 animate-in fade-in duration-300">
      <section className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-3">
                <PieChart size={13} className="text-primary/50" strokeWidth={1.5} />
                <p className="text-[9px] font-bold uppercase tracking-[0.6em] opacity-50">Presence Lattice</p>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((lvl) => (
                  <div
                    key={lvl}
                    className={cn(
                      'w-2 h-2 rounded-[2px] transition-all duration-500',
                      lvl === 0 ? 'bg-muted/50 dark:bg-white/[0.03]' : lvl === 1 ? 'bg-primary/20' : lvl === 2 ? 'bg-primary/50' : 'bg-primary gold-glow'
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="luxury-card p-6 bg-muted/30 dark:bg-black/30">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-max">
                  {heatmapData.map((day, idx) => (
                    <div
                      key={idx}
            className={cn(
                        'w-3.5 h-3.5 rounded-[3px] transition-all duration-700 cursor-default border border-border/50 dark:border-white/[0.02]',
                        day.intensity === 0
                          ? 'bg-muted/50 dark:bg-white/[0.02] hover:bg-muted/70 dark:hover:bg-white/[0.08]'
                          : day.intensity === 1
                            ? 'bg-primary/10 hover:bg-primary/20'
                            : day.intensity === 2
                              ? 'bg-primary/30 hover:bg-primary/40 shadow-[0_0_8px_rgba(212,175,55,0.1)]'
                              : 'bg-primary gold-glow shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110'
                      )}
                      title={`${day.hours.toFixed(1)}h focus on ${day.date.toLocaleDateString()}`}
                    />
                  ))}
        </div>
          </div>
              <p className="text-[7px] font-bold uppercase tracking-[0.4em] opacity-40 mt-4 text-center">8-Week Tactical Continuity</p>
          </div>
      </section>
          <section className="luxury-card p-8 space-y-6">
        <div className="flex justify-between items-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Timeline (Integrity + Objectives)</p>
              <span className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-50">Last 30 days</span>
        </div>
        {timelineChartData.length > 0 ? (
          <>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData}>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={[0, 10]} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="integrity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
                <Collapsible open={timelineTableOpen} onOpenChange={setTimelineTableOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.25em] opacity-50 hover:opacity-100 transition-opacity duration-200"
                    >
                      {timelineTableOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      {timelineTableOpen ? 'Hide table' : 'Show table'}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-x-auto -mx-2 mt-4">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                          <tr className="border-b border-border/40 dark:border-white/10">
                            <th className="py-2 pr-4 font-bold uppercase tracking-wider opacity-50">Date</th>
                            <th className="py-2 pr-4 font-bold uppercase tracking-wider opacity-50">Focus (h)</th>
                            <th className="py-2 pr-4 font-bold uppercase tracking-wider opacity-50">Target (h)</th>
                            <th className="py-2 pr-4 font-bold uppercase tracking-wider opacity-50">Objective</th>
                            <th className="py-2 font-bold uppercase tracking-wider opacity-50">Integrity</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 14).map((s) => (
                            <tr key={s.date} className="border-b border-border/30 dark:border-white/5 hover:bg-muted/20 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 pr-4">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="py-2 pr-4 tabular-nums">{s.focusHours.toFixed(1)}</td>
                      <td className="py-2 pr-4 tabular-nums">{s.targetHours.toFixed(1)}</td>
                      <td className="py-2 pr-4">{s.objectivesMet ? 'Yes' : 'No'}</td>
                      <td className="py-2 tabular-nums">{s.integrity}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                  </CollapsibleContent>
                </Collapsible>
          </>
        ) : (
              <p className="text-[9px] opacity-50 py-8 text-center">
            No daily snapshots yet. Snapshots are saved when you open the app on a new day (sealing the previous day).
          </p>
        )}
      </section>
        </TabsContent>

        <TabsContent value="hoje" className="space-y-8 mt-8 animate-in fade-in duration-300">
      <section className="space-y-8">
        <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.6em] opacity-50">Audit Ledger Today</p>
          <p className="text-[8px] font-medium opacity-30 mt-1">
                Focus sessions recorded today. Sealed + in progress = Daily Yield.
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
                <div className="luxury-card p-6 rounded-2xl flex justify-between items-center border-l-4 border-l-primary/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                      <Zap size={14} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-light">{activeAssetName}</p>
                  <p className="text-[8px] font-black uppercase opacity-50">In progress</p>
                </div>
              </div>
                  <p className="text-xl font-light tabular-nums tracking-tighter text-primary">{Math.floor(inProgressSecs / 60)}m</p>
            </div>
          )}
              {(showAllToday ? todayLogs : todayLogs.slice(0, TODAY_DISPLAY_LIMIT)).map((log) => (
                <div key={log.id} className="luxury-card p-6 rounded-2xl flex justify-between items-center border-l-4 border-l-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/5 text-primary">
                      <Zap size={14} strokeWidth={1.5} />
                </div>
                <div>
                      <p className="text-sm font-light">
                        {log.assetId ? assets.find((a) => a.id === log.assetId)?.name ?? log.assetName : log.assetName}
                      </p>
                      <p className="text-[8px] font-black uppercase opacity-50">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="text-xl font-light tabular-nums tracking-tighter">
                {Math.floor(log.duration / 60)}h {log.duration % 60}m
              </p>
            </div>
          ))}
              {todayLogs.length > TODAY_DISPLAY_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllToday((v) => !v)}
                  className="w-full py-3 rounded-2xl border border-border/50 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  {showAllToday ? 'Mostrar menos' : `Ver tudo (${todayLogs.length} sessões)`}
                </button>
              )}
          {todayLogs.length === 0 && lifeTracker.activeMode !== 'focus' && (
                <div className="luxury-card py-14 text-center opacity-50 flex flex-col items-center gap-4 border border-dashed border-foreground/10 rounded-3xl">
                  <Clock size={28} strokeWidth={1.5} className="opacity-70" />
                  <p className="text-[8px] font-bold uppercase tracking-[0.6em]">No Activity Found</p>
            </div>
          )}
        </div>
      </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}