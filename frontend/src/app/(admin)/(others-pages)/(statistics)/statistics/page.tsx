'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import {
  Users, FileText, Tag, BarChart2, Flag,
  TrendingUp, TrendingDown, Minus, Eye,
  Heart, Bookmark, MessageSquare, ShieldAlert,
  AlertTriangle, CheckCircle, Clock, XCircle,
  RefreshCw, Layers, Download,
} from 'lucide-react';
import {
  statsService,
  DashboardStats, UserActivityStats, ModerationStats,
  EngagementStats, CategoryStats, TagStats, ReportsStats,
} from '../../../../../../services/stats.service';
import { getToken } from '../../../../../../services/auth.service';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green:  '#00926B',
  blue:   '#3b82f6',
  red:    '#ef4444',
  amber:  '#f59e0b',
  violet: '#8b5cf6',
  cyan:   '#06b6d4',
  indigo: '#6366f1',
  gray:   '#6b7280',
};

// ─── Shared ApexCharts base ───────────────────────────────────────────────────
function baseOptions(dark: boolean): ApexOptions {
  return {
    chart: {
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
    },
    theme: { mode: dark ? 'dark' : 'light' },
    grid: {
      borderColor: dark ? '#1f2937' : '#f3f4f6',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
    dataLabels: { enabled: false },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function GrowthBadge({ value }: { value: number }) {
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><TrendingUp size={11} />+{value}%</span>;
  if (value < 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500"><TrendingDown size={11} />{value}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-400"><Minus size={11} />0%</span>;
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', growth }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: keyof typeof PALETTE; growth?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${PALETTE[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 leading-none">{fmt(Number(value))}</p>
        {(sub || growth !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {sub && <span className="text-xs text-gray-400">{sub}</span>}
            {growth !== undefined && <GrowthBadge value={growth} />}
          </div>
        )}
      </div>
    </div>
  );
}

const PALETTE: Record<string, string> = {
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  emerald:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  rose:   'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
  cyan:   'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
};

function SectionTitle({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon size={16} className="text-gray-600 dark:text-gray-300" />
      </div>
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`} />;
}

function ChartSkeleton() {
  return <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-64 m-4" />;
}

const REASON_LABELS: Record<string, string> = {
  misinformation: 'Désinformation',
  spam: 'Spam',
  inappropriate_content: 'Contenu inapproprié',
  plagiarism: 'Plagiat',
  hate_speech: 'Discours haineux',
  harassment: 'Harcèlement',
  impersonation: 'Usurpation d\'identité',
  other: 'Autre',
};

// ─── Main page ────────────────────────────────────────────────────────────────
type Section = 'users' | 'articles' | 'moderation' | 'tags' | 'reports';

export default function StatisticsPage() {
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dark, setDark] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityStats | null>(null);
  const [moderation, setModeration] = useState<ModerationStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [categories, setCategories] = useState<CategoryStats | null>(null);
  const [tags, setTags] = useState<TagStats | null>(null);
  const [reports, setReports] = useState<ReportsStats | null>(null);

  // Detect dark mode
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, ua, mod, eng, cat, tag, rep] = await Promise.all([
        statsService.getDashboardStats(),
        statsService.getUserActivityStats(6),
        statsService.getModerationStats(30),
        statsService.getEngagementStats(5),
        statsService.getCategoryStats(),
        statsService.getTagStats(),
        statsService.getReportsStats(),
      ]);
      setDashboard(d); setUserActivity(ua); setModeration(mod);
      setEngagement(eng); setCategories(cat); setTags(tag); setReports(rep);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const token = getToken();
      if (!token) { router.push('/signin'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') { router.push('/error-403'); return; }
      setIsCheckingRole(false);
    } catch { router.push('/signin'); }
  }, [router]);

  useEffect(() => { if (!isCheckingRole) loadAll(); }, [isCheckingRole, loadAll]);

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'users',      label: 'Utilisateurs',     icon: Users },
    { id: 'articles',   label: 'Articles',          icon: FileText },
    { id: 'moderation', label: 'Modération',        icon: ShieldAlert },
    { id: 'tags',       label: 'Tags & Catégories', icon: Tag },
    { id: 'reports',    label: 'Signalements',      icon: Flag },
  ];

  // ── Chart configs (memoized) ────────────────────────────────────────────────

  // Users — area chart: new + active users per month
  const usersAreaChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const history = userActivity?.history ?? [];
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'area', height: 280 },
        colors: [C.green, C.blue],
        stroke: { curve: 'smooth', width: [2.5, 2.5] },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.0 } },
        markers: { size: 4, strokeColors: dark ? '#111827' : '#fff', strokeWidth: 2, hover: { size: 6 } },
        xaxis: {
          categories: history.map((m) => m.month),
          axisBorder: { show: false }, axisTicks: { show: false },
          labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        tooltip: { ...baseOptions(dark).tooltip, shared: true, intersect: false },
      },
      series: [
        { name: 'Nouveaux utilisateurs', data: history.map((m) => m.newUsers) },
        { name: 'Utilisateurs actifs',   data: history.map((m) => m.activeUsers) },
      ],
    };
  }, [userActivity, dark]);

  // Users — bar: articles published per month
  const articlesPerMonthChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const history = userActivity?.history ?? [];
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'bar', height: 200 },
        colors: [C.indigo],
        plotOptions: { bar: { borderRadius: 5, columnWidth: '50%', borderRadiusApplication: 'end' } },
        xaxis: {
          categories: history.map((m) => m.month),
          axisBorder: { show: false }, axisTicks: { show: false },
          labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} articles` } },
      },
      series: [{ name: 'Articles publiés', data: history.map((m) => m.articlesPublished) }],
    };
  }, [userActivity, dark]);

  // Articles — horizontal bar: most liked
  const likedChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const items = [...(engagement?.mostLikedArticles ?? [])].reverse();
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'bar', height: 260 },
        colors: [C.red],
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%', borderRadiusApplication: 'end' } },
        xaxis: {
          categories: items.map((a) => a.title.length > 30 ? a.title.slice(0, 30) + '…' : a.title),
          labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} likes` } },
      },
      series: [{ name: 'Likes', data: items.map((a) => a.likesCount) }],
    };
  }, [engagement, dark]);

  // Articles — horizontal bar: most bookmarked
  const bookmarkedChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const items = [...(engagement?.mostBookmarkedArticles ?? [])].reverse();
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'bar', height: 260 },
        colors: [C.violet],
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%', borderRadiusApplication: 'end' } },
        xaxis: {
          categories: items.map((a) => a.title.length > 30 ? a.title.slice(0, 30) + '…' : a.title),
          labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} favoris` } },
      },
      series: [{ name: 'Favoris', data: items.map((a) => a.bookmarksCount) }],
    };
  }, [engagement, dark]);

  // Moderation — donut: status breakdown
  const moderationDonut = useMemo((): { options: ApexOptions; series: number[] } => {
    const breakdown = moderation?.statusBreakdown ?? [];
    const STATUS_COLORS_MAP: Record<string, string> = {
      published: C.green, pending: C.amber, rejected: C.red, draft: C.gray,
    };
    const STATUS_LABELS_MAP: Record<string, string> = {
      published: 'Publiés', pending: 'En attente', rejected: 'Rejetés', draft: 'Brouillons',
    };
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'donut', height: 280 },
        colors: breakdown.map((s) => STATUS_COLORS_MAP[s.status] ?? C.gray),
        labels: breakdown.map((s) => STATUS_LABELS_MAP[s.status] ?? s.status),
        legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: dark ? '#d1d5db' : '#374151' } } } } },
        stroke: { show: false },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} articles` } },
      },
      series: breakdown.map((s) => s.count),
    };
  }, [moderation, dark]);

  // Moderation — area: daily approved vs rejected (last 14 days with data)
  const moderationTrendChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const trend = (moderation?.dailyTrend ?? [])
      .filter((d) => d.approved + d.rejected + d.pending > 0)
      .slice(-14);
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'area', height: 240 },
        colors: [C.green, C.red, C.amber],
        stroke: { curve: 'smooth', width: [2, 2, 2] },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.0 } },
        markers: { size: 3, strokeColors: dark ? '#111827' : '#fff', strokeWidth: 2, hover: { size: 5 } },
        xaxis: {
          categories: trend.map((d) => d.date.slice(5)),
          axisBorder: { show: false }, axisTicks: { show: false },
          labels: { rotate: -30, style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '10px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        tooltip: { ...baseOptions(dark).tooltip, shared: true, intersect: false },
      },
      series: [
        { name: 'Approuvés', data: trend.map((d) => d.approved) },
        { name: 'Rejetés',   data: trend.map((d) => d.rejected) },
        { name: 'En attente',data: trend.map((d) => d.pending) },
      ],
    };
  }, [moderation, dark]);

  // Tags — horizontal bar: top 10 tags
  const tagsBarChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const items = [...(tags?.mostUsed.slice(0, 10) ?? [])].reverse();
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'bar', height: 320 },
        colors: [C.violet],
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%', borderRadiusApplication: 'end' } },
        xaxis: {
          categories: items.map((t) => t.name),
          labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '11px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '12px' } } },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} articles` } },
      },
      series: [{ name: 'Articles', data: items.map((t) => t.articleCount) }],
    };
  }, [tags, dark]);

  // Categories — bar chart
  const categoriesBarChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => {
    const items = categories?.categories.slice(0, 10) ?? [];
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'bar', height: 280 },
        colors: [C.blue, C.cyan],
        plotOptions: { bar: { borderRadius: 5, columnWidth: '45%', borderRadiusApplication: 'end', grouped: true } },
        xaxis: {
          categories: items.map((c) => c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name),
          axisBorder: { show: false }, axisTicks: { show: false },
          labels: { rotate: -30, style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '10px' } },
        },
        yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        tooltip: { ...baseOptions(dark).tooltip, shared: true, intersect: false },
      },
      series: [
        { name: 'Articles',  data: items.map((c) => c.articleCount) },
        { name: 'Vues (÷10)', data: items.map((c) => Math.round(c.totalViews / 10)) },
      ],
    };
  }, [categories, dark]);

  // Reports — donut: article reports by reason
  const articleReportsDonut = useMemo((): { options: ApexOptions; series: number[] } => {
    const items = reports?.articles.byReason ?? [];
    const COLORS = [C.red, C.amber, C.violet, C.blue, C.indigo, C.cyan, C.green, C.gray];
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'donut', height: 280 },
        colors: COLORS.slice(0, items.length),
        labels: items.map((r) => REASON_LABELS[r.reason] ?? r.reason),
        legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        plotOptions: { pie: { donut: { size: '60%' } } },
        stroke: { show: false },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} signalement(s)` } },
      },
      series: items.map((r) => r.count),
    };
  }, [reports, dark]);

  // Reports — donut: user reports by reason
  const userReportsDonut = useMemo((): { options: ApexOptions; series: number[] } => {
    const items = reports?.users.byReason ?? [];
    const COLORS = [C.amber, C.red, C.violet, C.blue, C.indigo, C.cyan, C.green, C.gray];
    return {
      options: {
        ...baseOptions(dark),
        chart: { ...baseOptions(dark).chart, type: 'donut', height: 280 },
        colors: COLORS.slice(0, items.length),
        labels: items.map((r) => REASON_LABELS[r.reason] ?? r.reason),
        legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
        plotOptions: { pie: { donut: { size: '60%' } } },
        stroke: { show: false },
        tooltip: { ...baseOptions(dark).tooltip, y: { formatter: (v) => `${v} signalement(s)` } },
      },
      series: items.map((r) => r.count),
    };
  }, [reports, dark]);

  // Reports — bar: status breakdown (articles vs users)
  const reportsStatusChart = useMemo((): { options: ApexOptions; series: ApexAxisChartSeries } => ({
    options: {
      ...baseOptions(dark),
      chart: { ...baseOptions(dark).chart, type: 'bar', height: 220 },
      colors: [C.amber, C.green, C.gray],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '50%', borderRadiusApplication: 'end', grouped: true } },
      xaxis: {
        categories: ['Articles signalés', 'Utilisateurs signalés'],
        axisBorder: { show: false }, axisTicks: { show: false },
        labels: { style: { colors: dark ? '#9ca3af' : '#6b7280', fontSize: '12px' } },
      },
      yaxis: { labels: { style: { colors: [dark ? '#9ca3af' : '#6b7280'], fontSize: '11px' } } },
      legend: { position: 'top', horizontalAlign: 'left', labels: { colors: dark ? '#d1d5db' : '#374151' } },
      tooltip: { ...baseOptions(dark).tooltip, shared: true, intersect: false },
    },
    series: [
      { name: 'En attente', data: [reports?.articles.pending ?? 0, reports?.users.pending ?? 0] },
      { name: 'Examinés',   data: [reports?.articles.reviewed ?? 0, reports?.users.reviewed ?? 0] },
      { name: 'Clôturés',   data: [reports?.articles.dismissed ?? 0, reports?.users.dismissed ?? 0] },
    ],
  }), [reports, dark]);

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    if (format === 'pdf') { window.print(); return; }

    let content = '';
    let filename = `statistiques-${activeSection}`;

    if (format === 'json') {
      const dataMap: Record<Section, unknown> = {
        users:      { kpi: { totalUsers: dashboard?.totalUsers, newUsersThisMonth: dashboard?.newUsersThisMonth }, history: userActivity?.history },
        articles:   { kpi: { totalArticles: dashboard?.totalArticles, totalLikes: engagement?.totalLikes, totalBookmarks: engagement?.totalBookmarks, totalComments: dashboard?.totalComments }, mostLiked: engagement?.mostLikedArticles, mostBookmarked: engagement?.mostBookmarkedArticles },
        moderation: { statusBreakdown: moderation?.statusBreakdown, dailyTrend: moderation?.dailyTrend, rejectionRate: moderation?.rejectionRate, autoModerationRate: moderation?.autoModerationRate },
        tags:       { tags: tags?.mostUsed, trending: tags?.topTrending, unusedTags: tags?.unusedTags, categories: categories?.categories },
        reports:    { articles: reports?.articles, users: reports?.users },
      };
      content = JSON.stringify(dataMap[activeSection], null, 2);
      filename += '.json';
    } else {
      const rows: string[][] = [];
      if (activeSection === 'users') {
        rows.push(['Mois', 'Nouveaux utilisateurs', 'Utilisateurs actifs', 'Articles publiés']);
        (userActivity?.history ?? []).forEach(m => rows.push([m.month, String(m.newUsers), String(m.activeUsers), String(m.articlesPublished)]));
      } else if (activeSection === 'articles') {
        rows.push(['Titre', 'Likes', 'Favoris']);
        const bookmarkMap = new Map((engagement?.mostBookmarkedArticles ?? []).map(a => [a.id, a.bookmarksCount]));
        (engagement?.mostLikedArticles ?? []).forEach(a => rows.push([`"${a.title.replace(/"/g, '""')}"`, String(a.likesCount), String(bookmarkMap.get(a.id) ?? '')]));
      } else if (activeSection === 'moderation') {
        rows.push(['Statut', 'Nombre', 'Pourcentage']);
        (moderation?.statusBreakdown ?? []).forEach(s => rows.push([s.status, String(s.count), `${s.percentage}%`]));
        rows.push([], ['Date', 'Approuvés', 'Rejetés', 'En attente']);
        (moderation?.dailyTrend ?? []).forEach(d => rows.push([d.date, String(d.approved), String(d.rejected), String(d.pending)]));
      } else if (activeSection === 'tags') {
        rows.push(['Tag', 'Articles']);
        (tags?.mostUsed ?? []).forEach(t => rows.push([t.name, String(t.articleCount)]));
        rows.push([], ['Catégorie', 'Articles', 'Vues']);
        (categories?.categories ?? []).forEach(c => rows.push([`"${c.name.replace(/"/g, '""')}"`, String(c.articleCount), String(c.totalViews)]));
      } else if (activeSection === 'reports') {
        rows.push(['Type', 'Total', 'En attente', 'Examinés', 'Clôturés']);
        rows.push(['Articles', String(reports?.articles.total ?? 0), String(reports?.articles.pending ?? 0), String(reports?.articles.reviewed ?? 0), String(reports?.articles.dismissed ?? 0)]);
        rows.push(['Utilisateurs', String(reports?.users.total ?? 0), String(reports?.users.pending ?? 0), String(reports?.users.reviewed ?? 0), String(reports?.users.dismissed ?? 0)]);
        rows.push([], ['Motif (articles)', 'Nombre']);
        (reports?.articles.byReason ?? []).forEach(r => rows.push([REASON_LABELS[r.reason] ?? r.reason, String(r.count)]));
        rows.push([], ['Motif (utilisateurs)', 'Nombre']);
        (reports?.users.byReason ?? []).forEach(r => rows.push([REASON_LABELS[r.reason] ?? r.reason, String(r.count)]));
      }
      content = rows.map(r => r.join(',')).join('\n');
      filename += '.csv';
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  if (isCheckingRole) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00926B]/10 flex items-center justify-center">
                <BarChart2 size={18} className="text-[#00926B]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Statistiques</h1>
                <p className="text-xs text-gray-400">Mise à jour : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export dropdown */}
              <div className="relative group">
                <button
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Download size={14} /> Exporter
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 hidden group-hover:block z-20 min-w-[110px]">
                  <button onClick={() => handleExport('csv')}  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">CSV</button>
                  <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">JSON</button>
                  <button onClick={() => handleExport('pdf')}  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">PDF</button>
                </div>
              </div>

              <button
                onClick={loadAll} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-px">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id} onClick={() => setActiveSection(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeSection === id
                    ? 'border-[#00926B] text-[#00926B]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertTriangle size={16} className="flex-shrink-0" />{error}
          </div>
        )}

        {/* ══ USERS ══════════════════════════════════════════════════════════ */}
        {activeSection === 'users' && (
          <>
            <SectionTitle title="Utilisateurs" icon={Users} />

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
                <StatCard icon={Users}     label="Total utilisateurs"  value={dashboard?.totalUsers ?? 0}                    color="blue" />
                <StatCard icon={TrendingUp} label="Nouveaux ce mois"   value={dashboard?.newUsersThisMonth ?? 0}              color="emerald" growth={userActivity?.growthRate.newUsers} />
                <StatCard icon={Users}     label="Actifs ce mois"      value={userActivity?.currentMonth.activeUsers ?? 0}    color="violet" growth={userActivity?.growthRate.activeUsers} />
                <StatCard icon={FileText}  label="Articles ce mois"    value={userActivity?.currentMonth.articlesPublished ?? 0} color="cyan" growth={userActivity?.growthRate.articlesPublished} />
              </>}
            </div>

            {/* Area chart: new + active users */}
            <Card title="Évolution des utilisateurs (6 derniers mois)">
              {loading ? <ChartSkeleton /> : (
                <div className="p-2">
                  <ReactApexChart
                    options={usersAreaChart.options}
                    series={usersAreaChart.series}
                    type="area" height={280}
                  />
                </div>
              )}
            </Card>

            {/* Bar: articles publiés par mois */}
            <Card title="Articles publiés par mois">
              {loading ? <ChartSkeleton /> : (
                <div className="p-2">
                  <ReactApexChart
                    options={articlesPerMonthChart.options}
                    series={articlesPerMonthChart.series}
                    type="bar" height={200}
                  />
                </div>
              )}
            </Card>

            {/* Top contributor */}
            {!loading && dashboard?.topContributor && (
              <Card title="Top contributeur">
                <div className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#00926B]/10 flex items-center justify-center text-[#00926B] font-bold text-xl">
                    {dashboard.topContributor.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{dashboard.topContributor.fullName}</p>
                    <p className="text-sm text-gray-500">{dashboard.topContributor.articlesCount} articles publiés</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══ ARTICLES ════════════════════════════════════════════════════════ */}
        {activeSection === 'articles' && (
          <>
            <SectionTitle title="Articles" icon={FileText} />

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
                <StatCard icon={FileText}       label="Total articles"    value={dashboard?.totalArticles ?? 0}    color="blue" />
                <StatCard icon={Heart}          label="Total likes"       value={engagement?.totalLikes ?? 0}      color="rose" />
                <StatCard icon={Bookmark}       label="Total favoris"     value={engagement?.totalBookmarks ?? 0}  color="violet" />
                <StatCard icon={MessageSquare}  label="Total commentaires" value={dashboard?.totalComments ?? 0}   color="amber" />
              </>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />) : <>
                <StatCard icon={FileText} label="Cette semaine"       value={dashboard?.articlesThisWeek ?? 0}       color="emerald" />
                <StatCard icon={Heart}    label="Moy. likes/article"  value={engagement?.avgLikesPerArticle ?? 0}    color="rose" />
                <StatCard icon={Bookmark} label="Moy. favoris/article" value={engagement?.avgBookmarksPerArticle ?? 0} color="violet" />
              </>}
            </div>

            {/* Charts side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="🔝 Articles les plus likés">
                {loading ? <ChartSkeleton /> : (
                  <div className="p-2">
                    <ReactApexChart
                      options={likedChart.options}
                      series={likedChart.series}
                      type="bar" height={260}
                    />
                  </div>
                )}
              </Card>

              <Card title="🔖 Articles les plus mis en favoris">
                {loading ? <ChartSkeleton /> : (
                  <div className="p-2">
                    <ReactApexChart
                      options={bookmarkedChart.options}
                      series={bookmarkedChart.series}
                      type="bar" height={260}
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Most active category */}
            {!loading && dashboard?.mostActiveCategory && (
              <Card title="Catégorie la plus active">
                <div className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                    <Layers size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{dashboard.mostActiveCategory.name}</p>
                    <p className="text-sm text-gray-500">{dashboard.mostActiveCategory.articleCount} articles</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══ MODERATION ══════════════════════════════════════════════════════ */}
        {activeSection === 'moderation' && (
          <>
            <SectionTitle title="Modération" icon={ShieldAlert} />

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
                <StatCard icon={Layers}       label="Total modérés (30j)"  value={moderation?.totalModerated ?? 0}                                                           color="blue" />
                <StatCard icon={CheckCircle}  label="Publiés"              value={moderation?.statusBreakdown.find((s) => s.status === 'published')?.count ?? 0}             color="emerald" sub={`${moderation?.statusBreakdown.find((s) => s.status === 'published')?.percentage ?? 0}%`} />
                <StatCard icon={XCircle}      label="Rejetés"              value={moderation?.statusBreakdown.find((s) => s.status === 'rejected')?.count ?? 0}              color="rose"    sub={`Taux: ${moderation?.rejectionRate ?? 0}%`} />
                <StatCard icon={Clock}        label="En attente"           value={moderation?.statusBreakdown.find((s) => s.status === 'pending')?.count ?? 0}               color="amber" />
              </>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut: status breakdown */}
              <Card title="Répartition par statut (30 derniers jours)">
                {loading ? <ChartSkeleton /> : (
                  moderationDonut.series.some((v) => v > 0) ? (
                    <div className="p-2">
                      <ReactApexChart
                        options={moderationDonut.options}
                        series={moderationDonut.series}
                        type="donut" height={280}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-400">Aucune donnée</div>
                  )
                )}
              </Card>

              {/* Rates */}
              <Card title="Indicateurs de modération">
                {loading ? <ChartSkeleton /> : (
                  <div className="p-6 space-y-6">
                    {[
                      { label: 'Taux de rejet',      value: moderation?.rejectionRate ?? 0,      color: '#ef4444', icon: XCircle },
                      { label: 'Auto-modération',     value: moderation?.autoModerationRate ?? 0, color: C.green,   icon: CheckCircle },
                      { label: 'Taux de publication', value: moderation?.statusBreakdown.find((s) => s.status === 'published')?.percentage ?? 0, color: C.blue, icon: FileText },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color }} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                          </div>
                          <span className="text-sm font-bold" style={{ color }}>{value}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Area: daily trend */}
            <Card title="Tendance quotidienne — 14 derniers jours actifs">
              {loading ? <ChartSkeleton /> : (
                moderationTrendChart.series[0].data.length > 0 ? (
                  <div className="p-2">
                    <ReactApexChart
                      options={moderationTrendChart.options}
                      series={moderationTrendChart.series}
                      type="area" height={240}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-400">Aucune activité récente</div>
                )
              )}
            </Card>
          </>
        )}

        {/* ══ TAGS & CATEGORIES ═══════════════════════════════════════════════ */}
        {activeSection === 'tags' && (
          <>
            <SectionTitle title="Tags & Catégories" icon={Tag} />

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
                <StatCard icon={Tag}       label="Total tags"       value={tags?.totalTags ?? 0}        color="violet" />
                <StatCard icon={TrendingUp} label="En tendance"     value={tags?.topTrending.length ?? 0} color="emerald" />
                <StatCard icon={Layers}    label="Tags inutilisés"  value={tags?.unusedTags ?? 0}        color="amber" />
                <StatCard icon={Layers}    label="Catégories"       value={dashboard?.totalCategories ?? 0} color="blue" />
              </>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tags bar */}
              <Card title="Top 10 tags les plus utilisés">
                {loading ? <ChartSkeleton /> : (
                  <div className="p-2">
                    <ReactApexChart
                      options={tagsBarChart.options}
                      series={tagsBarChart.series}
                      type="bar" height={320}
                    />
                  </div>
                )}
              </Card>

              {/* Categories bar */}
              <Card title="Top 10 catégories">
                {loading ? <ChartSkeleton /> : (
                  <div className="p-2">
                    <ReactApexChart
                      options={categoriesBarChart.options}
                      series={categoriesBarChart.series}
                      type="bar" height={280}
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Trending tags cloud */}
            {!loading && tags && tags.topTrending.length > 0 && (
              <Card title="Tags en tendance ce mois">
                <div className="p-6 flex flex-wrap gap-2">
                  {tags.topTrending.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
                    >
                      <TrendingUp size={10} />{t.name}
                      <span className="opacity-60 font-normal">({t.articleCount})</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══ REPORTS ═════════════════════════════════════════════════════════ */}
        {activeSection === 'reports' && (
          <>
            <SectionTitle title="Signalements" icon={Flag} />

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
                <StatCard icon={FileText}     label="Signalements articles"     value={reports?.articles.total ?? 0}  color="rose" />
                <StatCard icon={Users}        label="Signalements utilisateurs" value={reports?.users.total ?? 0}     color="amber" />
                <StatCard icon={Clock}        label="En attente (articles)"     value={reports?.articles.pending ?? 0} color="amber" />
                <StatCard icon={Clock}        label="En attente (users)"        value={reports?.users.pending ?? 0}   color="violet" />
              </>}
            </div>

            {/* Status grouped bar */}
            <Card title="Statut des signalements — articles vs utilisateurs">
              {loading ? <ChartSkeleton /> : (
                <div className="p-2">
                  <ReactApexChart
                    options={reportsStatusChart.options}
                    series={reportsStatusChart.series}
                    type="bar" height={220}
                  />
                </div>
              )}
            </Card>

            {/* Donuts: by reason */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Motifs — Signalements d'articles">
                {loading ? <ChartSkeleton /> : (
                  articleReportsDonut.series.length > 0 && articleReportsDonut.series.some((v) => v > 0) ? (
                    <div className="p-2">
                      <ReactApexChart
                        options={articleReportsDonut.options}
                        series={articleReportsDonut.series}
                        type="donut" height={280}
                      />
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-gray-400">Aucun signalement</div>
                  )
                )}
              </Card>

              <Card title="Motifs — Signalements d'utilisateurs">
                {loading ? <ChartSkeleton /> : (
                  userReportsDonut.series.length > 0 && userReportsDonut.series.some((v) => v > 0) ? (
                    <div className="p-2">
                      <ReactApexChart
                        options={userReportsDonut.options}
                        series={userReportsDonut.series}
                        type="donut" height={280}
                      />
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-gray-400">Aucun signalement</div>
                  )
                )}
              </Card>
            </div>

            {/* Top reported articles */}
            {!loading && reports && reports.articles.topReported.length > 0 && (
              <Card title="Articles les plus signalés">
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {reports.articles.topReported.map((item, i) => (
                    <li key={item.id} className="px-6 py-3 flex items-center gap-4">
                      <span className="w-5 text-xs text-gray-400 font-bold flex-shrink-0">{i + 1}</span>
                      <p className="flex-1 text-sm text-gray-800 dark:text-white truncate">{item.title}</p>
                      <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-full flex-shrink-0">
                        {item.reportCount} signalement{item.reportCount > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Top reported users */}
            {!loading && reports && reports.users.topReported.length > 0 && (
              <Card title="Utilisateurs les plus signalés">
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {reports.users.topReported.map((item, i) => (
                    <li key={item.id} className="px-6 py-3 flex items-center gap-4">
                      <span className="w-5 text-xs text-gray-400 font-bold flex-shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 text-xs font-bold flex-shrink-0">
                        {(item.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <p className="flex-1 text-sm text-gray-800 dark:text-white truncate">{item.name}</p>
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full flex-shrink-0">
                        {item.reportCount} signalement{item.reportCount > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
