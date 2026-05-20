// app/components/tags/TagsManager.tsx
"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag as TagIcon,
  TrendingUp,
  Hash,
  Search,
  Plus,
  X,
  List,
  Cloud,
  Pencil,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  count: number;
  trending?: boolean;
  color?: string;
}

interface TagsManagerProps {
  tags: TagItem[];
  onDeleteTag: (id: string) => void;
  onEditTag: (tag: TagItem) => void;
  onSearch: (query: string) => void;
  viewMode: "cloud" | "list";
  onViewModeChange: (mode: "cloud" | "list") => void;
  onCreateTagClick: () => void;
}

type ActiveFilter = "all" | "trending" | "unused";
type SortField = "name" | "count";
type SortDir = "asc" | "desc";

export default function TagsManager({
  tags,
  onDeleteTag,
  onEditTag,
  onSearch,
  viewMode,
  onViewModeChange,
  onCreateTagClick,
}: TagsManagerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortField, setSortField] = useState<SortField>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Stats
  const trendingTags = useMemo(() => tags.filter((t) => t.trending), [tags]);
  const unusedTags = useMemo(() => tags.filter((t) => t.count === 0), [tags]);
  const totalUsage = useMemo(() => tags.reduce((s, t) => s + t.count, 0), [tags]);
  const maxCount = useMemo(() => (tags.length > 0 ? Math.max(...tags.map((t) => t.count)) : 0), [tags]);

  // Filter + search + sort
  const processedTags = useMemo(() => {
    let result = tags;

    // Filter by category
    if (activeFilter === "trending") result = result.filter((t) => t.trending);
    else if (activeFilter === "unused") result = result.filter((t) => t.count === 0);

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else cmp = a.count - b.count;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tags, activeFilter, searchQuery, sortField, sortDir]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onSearch(val);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "count" ? "desc" : "asc");
    }
  };

  const handleStatClick = (filter: ActiveFilter) => {
    setActiveFilter((prev) => (prev === filter ? "all" : filter));
    setSearchQuery("");
    onSearch("");
  };

  const getTagSizeClass = (count: number) => {
    if (maxCount === 0) return "text-sm px-3 py-1";
    const r = count / maxCount;
    if (r > 0.8) return "text-2xl font-bold px-6 py-3 shadow-md";
    if (r > 0.5) return "text-xl font-semibold px-5 py-2";
    if (r > 0.2) return "text-base font-medium px-4 py-1.5";
    return "text-sm px-3 py-1";
  };

  const getTagColor = (tag: TagItem) => {
    if (tag.color) return tag.color;
    if (tag.trending)
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
  };

  const statCards: { filter: ActiveFilter; label: string; value: number; gradient: string; icon: React.ReactNode }[] = [
    {
      filter: "all",
      label: t("tags_page.stat_total"),
      value: tags.length,
      gradient: "from-blue-500 to-blue-600",
      icon: <TagIcon size={18} />,
    },
    {
      filter: "trending",
      label: t("tags_page.stat_trending"),
      value: trendingTags.length,
      gradient: "from-green-500 to-green-600",
      icon: <TrendingUp size={18} />,
    },
    {
      filter: "unused",
      label: t("tags_page.stat_unused"),
      value: unusedTags.length,
      gradient: "from-amber-500 to-amber-600",
      icon: <Hash size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* STAT CARDS — clickable filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(({ filter, label, value, gradient, icon }) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={label}
              onClick={() => handleStatClick(filter)}
              className={`text-left bg-white dark:bg-gray-900 rounded-xl border-2 p-5 hover:shadow-lg transition-all cursor-pointer ${
                isActive
                  ? "border-[#168F6F] shadow-md ring-2 ring-[#168F6F]/20"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
              </div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                {value}
              </p>
              {isActive && (
                <p className="text-xs text-[#168F6F] mt-1 font-medium">{t("tags_page.active_filter_reset")}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t("tags_page.search_placeholder")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#168F6F] outline-none transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort buttons */}
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-white dark:bg-gray-900">
            <button
              onClick={() => toggleSort("name")}
              title={t("tags_page.sort_by_name_title")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortField === "name"
                  ? "bg-[#168F6F] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {sortField === "name" && sortDir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
              {t("tags_page.btn_name")}
            </button>
            <button
              onClick={() => toggleSort("count")}
              title={t("tags_page.sort_by_usage_title")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortField === "count"
                  ? "bg-[#168F6F] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {sortField === "count" && sortDir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
              {t("tags_page.btn_usage")}
            </button>
          </div>

          {/* View toggle */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => onViewModeChange("cloud")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "cloud" ? "bg-white dark:bg-gray-700 shadow-sm text-[#168F6F]" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              title={t("tags_page.view_cloud_title")}
            >
              <Cloud className="w-4 h-4" />
              {t("tags_page.view_cloud")}
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm text-[#168F6F]" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              title={t("tags_page.view_list_title")}
            >
              <List className="w-4 h-4" />
              {t("tags_page.view_list")}
            </button>
          </div>

          <button
            onClick={onCreateTagClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#168F6F] hover:bg-[#0e6b52] text-white rounded-xl text-xs font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t("tags_page.create_btn")}
          </button>
        </div>
      </div>

      {/* Active filter + results count */}
      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-[#168F6F]" />
          <span className="text-gray-500 dark:text-gray-400">{t("tags_page.filter_active_label")}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#168F6F]/10 text-[#168F6F] rounded-full text-xs font-semibold border border-[#168F6F]/20">
            {activeFilter === "trending" ? t("tags_page.filter_trending") : t("tags_page.filter_unused")}
            <button onClick={() => { setActiveFilter("all"); onSearch(""); }} aria-label="remove filter">
              <X className="w-3 h-3" />
            </button>
          </span>
          <span className="text-gray-400 text-xs">
            {processedTags.length === 1
              ? t("tags_page.results_one", { count: processedTags.length })
              : t("tags_page.results_plural", { count: processedTags.length })}
          </span>
        </div>
      )}

      {/* Trending quick access */}
      <AnimatePresence>
        {trendingTags.length > 0 && searchQuery === "" && activeFilter === "all" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> {t("tags_page.trending_section_title")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-bold text-[#168F6F] dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50"
                  >
                    {tag.name} <span className="ml-1 opacity-60">{tag.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN DISPLAY */}
      <div className="min-h-[400px]">
        {viewMode === "cloud" ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-center gap-6">
            {processedTags.length > 0 ? (
              processedTags.map((tag, idx) => (
                <motion.div
                  key={tag.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative"
                >
                  <div className={`${getTagSizeClass(tag.count)} ${getTagColor(tag)} rounded-2xl transition-all duration-300 flex items-center gap-2`}>
                    <Hash className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    {tag.name}
                    <span className="text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md">{tag.count}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditTag(tag)}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                      title={t("tags_page.btn_edit")}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteTag(tag.id)}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                      title={t("tags_page.btn_delete")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-left">
                {t("tags_page.col_name")} <ArrowUpDown className="w-3 h-3" />
              </button>
              <button onClick={() => toggleSort("count")} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors pr-4">
                {t("tags_page.col_publications")} <ArrowUpDown className="w-3 h-3" />
              </button>
              <span className="pr-4">{t("tags_page.col_status")}</span>
              <span>{t("tags_page.col_actions")}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {processedTags.length > 0 ? (
                processedTags.map((tag, idx) => (
                  <motion.div
                    key={tag.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getTagColor(tag)}`}>
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{tag.name}</p>
                      </div>
                    </div>

                    <span className="pr-6 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {tag.count}
                    </span>

                    <span className="pr-4">
                      {tag.trending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                          <TrendingUp className="w-3 h-3" /> {t("tags_page.status_trending")}
                        </span>
                      ) : tag.count === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">
                          {t("tags_page.status_unused")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                          {t("tags_page.status_active")}
                        </span>
                      )}
                    </span>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditTag(tag)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title={t("tags_page.btn_edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTag(tag.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title={t("tags_page.btn_delete")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-300">
        <Search className="w-10 h-10" />
      </div>
      <div>
        <p className="text-gray-900 dark:text-white font-medium">{t("tags_page.empty_title")}</p>
        <p className="text-sm text-gray-500">{t("tags_page.empty_text")}</p>
      </div>
    </div>
  );
}
