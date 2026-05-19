'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Eye, FileText, Users, ArrowUp, ArrowDown,
  Minus, Tag, Heart, MessageCircle, Clock, AlertCircle,
  Flame, BookOpen, ChevronRight, Crown, Medal, Star,
  BarChart2, Zap,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { statsService, EmployeeTrendingStats } from '../../../../../../services/stats.service';
import { publicationService } from '../../../../../../services/publication.service';
import { usePublicationModal } from '@/context/PublicationModalContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const fmtDateLong = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const engagementScore = (a: EmployeeTrendingStats['topPublications'][0]) => {
  const total = a.likesCount + a.commentsCount * 2;
  if (!a.viewsCount) return 0;
  return Math.min(100, Math.round((total / a.viewsCount) * 100));
};

const RANK_BADGE: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-300/60 shadow-md',
  2: 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600 ring-2 ring-slate-300/50',
  3: 'bg-gradient-to-br from-amber-600 to-orange-700 ring-2 ring-amber-500/50 shadow-md',
};

const RANK_RING: Record<number, string> = {
  1: 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-gray-900',
  2: 'ring-2 ring-slate-300 dark:ring-slate-500 ring-offset-2 dark:ring-offset-gray-900',
  3: 'ring-2 ring-orange-300 dark:ring-orange-600 ring-offset-2 dark:ring-offset-gray-900',
};

function RankIcon({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm';
  const badge = RANK_BADGE[rank] ?? 'bg-gray-200 dark:bg-gray-700';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-xl font-extrabold text-white ${dim} ${badge} transition-transform duration-200 group-hover:scale-110`}>
      {rank === 1 ? <Crown className={iconSize} /> : rank === 2 ? <Medal className={iconSize} /> : rank}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon, title, subtitle, children, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="h-1 w-full bg-[#168F6F]" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#168F6F]/10 dark:bg-[#168F6F]/15">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
              {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-14 w-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-56 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-5">
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, title, value, growth, sub }: {
  icon: React.ReactNode;
  title: string;
  value: number;
  growth?: number;
  sub?: string;
}) {
  const hasGrowth = growth !== undefined && growth !== 0;
  const positive = (growth ?? 0) > 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#168F6F]" />
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#168F6F] shadow-md shadow-[#168F6F]/20">
          {icon}
        </div>
        {hasGrowth && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            positive
              ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F]'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(growth!)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{fmt(value)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Hero Publication (rank 1) ──────────────────────────────────────────────────────

function HeroPublication({ publication, onPublicationClick }: {
  publication: EmployeeTrendingStats['topPublications'][0];
  onPublicationClick: (publication: EmployeeTrendingStats['topPublications'][0]) => void;
}) {
  const score = engagementScore(publication);
  const initials = publication.author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={() => onPublicationClick(publication)}
      className="group block cursor-pointer rounded-xl border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 dark:from-amber-900/10 dark:to-yellow-900/5 px-5 py-4 hover:from-amber-50 hover:to-yellow-50/60 dark:hover:from-amber-900/15 dark:hover:to-yellow-900/10 transition-all duration-200 active:scale-[0.99]">
        <div className="flex items-start gap-4">
          {/* Big rank badge */}
          <RankIcon rank={1} size="lg" />

          <div className="flex-1 min-w-0">
            {/* Category + date */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F] border border-[#168F6F]/20">
                {publication.category.name}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="h-3 w-3" />
                {fmtDateLong(publication.publishedAt)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-[#168F6F] transition-colors leading-snug">
              {publication.title}
            </h3>

            {/* Excerpt */}
            {publication.excerpt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                {publication.excerpt}
              </p>
            )}

            {/* Author */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-[#168F6F]/15 dark:bg-[#168F6F]/20 flex items-center justify-center text-[#168F6F] text-[10px] font-bold overflow-hidden flex-shrink-0">
                {publication.author.avatar
                  ? <Image src={publication.author.avatar} alt={publication.author.name} width={24} height={24} className="object-cover w-full h-full" />
                  : initials}
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{publication.author.name}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(publication.viewsCount)}</span>
                <span>vues</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Heart className="h-3.5 w-3.5 text-rose-400" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(publication.likesCount)}</span>
                <span>j&apos;aime</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(publication.commentsCount)}</span>
                <span>comm.</span>
              </span>
              {score > 0 && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{score}% engagement</span>
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 flex-shrink-0 self-center text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    </div>
  );
}

// ── Publication Row (rank 2+) ──────────────────────────────────────────────────────

function PublicationRow({ publication, rank, onPublicationClick }: {
  publication: EmployeeTrendingStats['topPublications'][0];
  rank: number;
  onPublicationClick: (publication: EmployeeTrendingStats['topPublications'][0]) => void;
}) {
  const score = engagementScore(publication);
  const initials = publication.author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={() => onPublicationClick(publication)}
      className="group block cursor-pointer"
    >
      <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 transition-colors duration-150 active:scale-[0.99]">
        <RankIcon rank={rank} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F] border border-[#168F6F]/20">
              {publication.category.name}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-[#168F6F] transition-colors leading-snug">
            {publication.title}
          </h3>

          {/* Author + date */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 rounded-full bg-[#168F6F]/10 dark:bg-[#168F6F]/20 flex items-center justify-center text-[#168F6F] text-[9px] font-bold overflow-hidden flex-shrink-0">
              {publication.author.avatar
                ? <Image src={publication.author.avatar} alt={publication.author.name} width={20} height={20} className="object-cover w-full h-full" />
                : initials}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{publication.author.name}</span>
            <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{fmtDate(publication.publishedAt)}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{fmt(publication.viewsCount)}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{fmt(publication.likesCount)}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{fmt(publication.commentsCount)}</span>
            </span>
            {score > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="font-medium text-amber-600 dark:text-amber-400">{score}%</span>
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 flex-shrink-0 self-center text-gray-200 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ── Tag Card ───────────────────────────────────────────────────────────────────

function TagCard({ tag, maxViews }: { tag: EmployeeTrendingStats['trendingTags'][0]; maxViews: number }) {
  const trendConfig = {
    up:     { icon: <ArrowUp className="h-3 w-3" />,    cls: 'text-[#168F6F] bg-[#168F6F]/10 dark:bg-[#168F6F]/15', label: 'En hausse' },
    down:   { icon: <ArrowDown className="h-3 w-3" />,  cls: 'text-red-500 bg-red-50 dark:bg-red-900/20',           label: 'En baisse'  },
    stable: { icon: <Minus className="h-3 w-3" />,      cls: 'text-gray-400 bg-gray-100 dark:bg-gray-800',          label: 'Stable'     },
  };
  const { icon, cls, label } = trendConfig[tag.trend];
  const hotness: number = (tag as any)['热度'] ?? (tag as any).hotness ?? 0;
  const pct = maxViews > 0 ? Math.round((tag.totalViews / maxViews) * 100) : 0;

  return (
    <div className="group rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 hover:border-[#168F6F]/30 hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex items-center justify-center h-7 w-7 rounded-lg flex-shrink-0 ${cls}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{tag.name}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {tag.publicationCount} publication{tag.publicationCount > 1 ? 's' : ''} · {fmt(tag.totalViews)} vues
            </p>
          </div>
        </div>
        {hotness > 0 && (
          <div className="flex-shrink-0 text-right">
            <span className="text-sm font-extrabold text-[#168F6F]">{hotness}°</span>
            <p className="text-[10px] text-gray-400">chaleur</p>
          </div>
        )}
      </div>

      {/* Relative popularity bar */}
      <div className="mt-2.5">
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#168F6F] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{pct}% de popularité relative</p>
      </div>
    </div>
  );
}

// ── Author Card ────────────────────────────────────────────────────────────────

function AuthorCard({ author, rank }: { author: EmployeeTrendingStats['topAuthors'][0]; rank: number }) {
  const initials = author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Link href={`/profile/${author.id}`} className="group block">
      <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 transition-colors duration-150">
        {/* Rank */}
        <RankIcon rank={rank} size="sm" />

        {/* Avatar */}
        <div className={`h-11 w-11 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] font-bold text-sm transition-transform duration-200 group-hover:scale-105 ${RANK_RING[rank] ?? ''}`}>
          {author.avatar
            ? <Image src={author.avatar} alt={author.name} width={44} height={44} className="object-cover w-full h-full" />
            : initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#168F6F] transition-colors">
              {author.name}
            </span>
            <span className="flex-shrink-0 text-xs font-extrabold text-[#168F6F]">
              {author.engagementRate}%
            </span>
          </div>
          {author.department && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mb-1">{author.department}</p>
          )}
          <div className="flex items-center gap-3 mb-1.5">
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{author.publicationCount} publications</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Eye className="h-3 w-3" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{fmt(author.totalViews)}</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Heart className="h-3 w-3 text-rose-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{fmt(author.totalLikes)}</span>
            </span>
          </div>
          {/* Engagement bar */}
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#168F6F] transition-all duration-700"
              style={{ width: `${Math.min(100, author.engagementRate)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Activity Chart ─────────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: EmployeeTrendingStats['dailyActivity'] }) {
  const maxViews    = Math.max(...data.map(d => d.views), 1);
  const maxPublications = Math.max(...data.map(d => d.publications), 1);
  const BAR_H       = 140;
  const totalViews    = data.reduce((s, d) => s + d.views, 0);
  const totalPublications = data.reduce((s, d) => s + d.publications, 0);
  const peakDay = data.reduce((best, d) => d.views > best.views ? d : best, data[0]);

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Publications total', value: totalPublications, icon: <FileText className="h-3.5 w-3.5 text-[#168F6F]" /> },
          { label: 'Vues total', value: fmt(totalViews), icon: <Eye className="h-3.5 w-3.5 text-[#168F6F]" /> },
          { label: 'Pic activité', value: fmtDate(peakDay?.date ?? ''), icon: <Star className="h-3.5 w-3.5 text-amber-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[11px] text-gray-400">{label}</span></div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm bg-[#168F6F]" />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Publications publiés</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm bg-[#168F6F]/25" />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Vues</span>
        </div>
      </div>

      {/* Grid lines + bars */}
      <div className="relative">
        {/* Y-axis ref lines */}
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <div
            key={frac}
            className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
            style={{ bottom: 24 + frac * BAR_H }}
          />
        ))}

        <div className="flex items-end gap-1.5" style={{ height: BAR_H + 24 }}>
          {data.map((day, i) => {
            const publicationH = Math.max(3, (day.publications / maxPublications) * BAR_H);
            const viewH    = Math.max(3, (day.views / maxViews) * BAR_H);
            const label    = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' });
            const isPeak   = peakDay && day.date === peakDay.date;

            return (
              <div key={i} className="group relative flex-1 flex flex-col items-center gap-1">
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  <p className="font-semibold capitalize">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                  <p className="text-gray-300">{day.publications} publications · {fmt(day.views)} vues</p>
                </div>

                <div className="relative w-full flex justify-center gap-0.5" style={{ height: BAR_H }}>
                  <div
                    className={`w-[44%] rounded-t transition-all duration-300 ${isPeak ? 'bg-[#168F6F]' : 'bg-[#168F6F]/70 group-hover:bg-[#168F6F]'}`}
                    style={{ height: publicationH, alignSelf: 'flex-end' }}
                  />
                  <div
                    className={`w-[44%] rounded-t transition-all duration-300 ${isPeak ? 'bg-[#168F6F]/40' : 'bg-[#168F6F]/20 group-hover:bg-[#168F6F]/35'}`}
                    style={{ height: viewH, alignSelf: 'flex-end' }}
                  />
                  {isPeak && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </div>

                <span className={`text-[10px] capitalize ${isPeak ? 'font-semibold text-[#168F6F]' : 'text-gray-400 dark:text-gray-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TrendingPage() {
  const [data, setData] = useState<EmployeeTrendingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const { openPublicationModal } = usePublicationModal();

  const handlePublicationClick = async (publication: EmployeeTrendingStats['topPublications'][0]) => {
    let authorId: number | undefined = publication.author.id;
    let authorAvatar: string | null = publication.author.avatar ?? null;

    let content = '';
    let description = publication.excerpt ?? '';
    let tags: string[] = [];
    let categorySlug = '';
    let initials = publication.author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    let department = '';
    let isLiked = false;
    let isBookmarked = false;
    let likes = publication.likesCount;
    let comments = publication.commentsCount;
    let views = publication.viewsCount;

    try {
      const full = await publicationService.findOne(publication.id);
      content      = full.content ?? '';
      description  = full.description ?? publication.excerpt ?? '';
      tags         = full.tags ?? [];
      categorySlug = full.category?.slug ?? '';
      initials     = full.author?.initials ?? initials;
      department   = full.author?.department ?? '';
      authorAvatar = full.author?.profileImage ?? full.author?.avatar ?? authorAvatar;
      isLiked      = full.isLiked ?? false;
      isBookmarked = full.isBookmarked ?? false;
      likes        = full.stats?.likes ?? likes;
      comments     = full.stats?.comments ?? comments;
      views        = full.stats?.views ?? views;
    } catch {}

    openPublicationModal({
      id: String(publication.id),
      title: publication.title,
      content,
      description,
      author: {
        id: authorId,
        name: publication.author.name,
        initials,
        department,
        avatar: authorAvatar,
      },
      category: { name: publication.category.name, slug: categorySlug },
      tags,
      publishedAt: publication.publishedAt,
      status: 'published' as const,
      stats: { likes, comments, views },
      isLiked,
      isBookmarked,
    });
  };

  const fetchTrendingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await statsService.getEmployeeTrendingStats();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrendingData(); }, []);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">Impossible de charger les tendances</p>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchTrendingData}
            className="px-5 py-2 rounded-xl bg-[#168F6F] text-white text-sm font-semibold hover:bg-[#127a5f] transition-colors shadow-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const [heroPublication, ...restPublications] = data.topPublications;
  const maxTagViews = Math.max(...data.trendingTags.map(t => t.totalViews), 1);

  // Compute total engagement for the period
  const totalLikes = data.topPublications.reduce((s, a) => s + a.likesCount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#168F6F] shadow-lg shadow-[#168F6F]/25">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Tendances</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                Semaine du {fmtDate(data.period.from)} au {fmtDate(data.period.to)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#168F6F]/10 dark:bg-[#168F6F]/15 border border-[#168F6F]/20 self-start sm:self-auto">
            <TrendingUp className="h-4 w-4 text-[#168F6F]" />
            <span className="text-sm font-semibold text-[#168F6F]">Cette semaine</span>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            icon={<FileText className="h-5 w-5 text-white" />}
            title="Publications publiés"
            value={data.stats.totalPublications}
            growth={data.stats.publicationsGrowth}
            sub={data.stats.publicationsGrowth !== 0 ? `vs semaine précédente` : undefined}
          />
          <StatCard
            icon={<Eye className="h-5 w-5 text-white" />}
            title="Vues totales"
            value={data.stats.totalViews}
            growth={data.stats.viewsGrowth}
            sub={data.stats.viewsGrowth !== 0 ? `vs semaine précédente` : undefined}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-white" />}
            title="Auteurs actifs"
            value={data.stats.activeAuthors}
          />
          <StatCard
            icon={<Heart className="h-5 w-5 text-white" />}
            title="J'aime reçus"
            value={totalLikes}
            sub="Top publications cumulés"
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Publications populaires */}
            <Section
              icon={<TrendingUp className="h-4 w-4 text-[#168F6F]" />}
              title="Publications populaires"
              subtitle={`Top ${data.topPublications.length} de la semaine`}
            >
              <div className="space-y-3">
                {/* Hero for rank 1 */}
                {heroPublication && <HeroPublication publication={heroPublication} onPublicationClick={handlePublicationClick} />}

                {/* Compact rows for rank 2+ */}
                {restPublications.length > 0 && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 -mx-5 -mb-5 mt-1">
                    {restPublications.map((publication, i) => (
                      <PublicationRow key={publication.id} publication={publication} rank={i + 2} onPublicationClick={handlePublicationClick} />
                    ))}
                  </div>
                )}

                {data.topPublications.length === 0 && (
                  <p className="py-10 text-center text-sm text-gray-400">Aucun publication cette semaine.</p>
                )}
              </div>
            </Section>

            {/* Activité quotidienne */}
            <Section
              icon={<BarChart2 className="h-4 w-4 text-[#168F6F]" />}
              title="Activité quotidienne"
              subtitle="Publications et consultations par jour"
            >
              {data.dailyActivity.length > 0
                ? <ActivityChart data={data.dailyActivity} />
                : <p className="py-8 text-center text-sm text-gray-400">Pas de données d'activité.</p>}
            </Section>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">

            {/* Tags tendance */}
            <Section
              icon={<Tag className="h-4 w-4 text-[#168F6F]" />}
              title="Tags tendance"
              subtitle="Popularité relative de la semaine"
            >
              <div className="space-y-2.5">
                {data.trendingTags.map(tag => (
                  <TagCard key={tag.id} tag={tag} maxViews={maxTagViews} />
                ))}
                {data.trendingTags.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">Aucun tag tendance.</p>
                )}
              </div>
            </Section>

            {/* Auteurs du moment */}
            <Section
              icon={<Users className="h-4 w-4 text-[#168F6F]" />}
              title="Auteurs du moment"
              subtitle="Classés par taux d'engagement"
            >
              <div className="space-y-0.5 -mx-2">
                {data.topAuthors.map((author, i) => (
                  <AuthorCard key={author.id} author={author} rank={i + 1} />
                ))}
                {data.topAuthors.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">Aucun auteur cette semaine.</p>
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
