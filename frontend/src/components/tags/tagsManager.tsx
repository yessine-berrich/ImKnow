// app/components/tags/TagsManager.tsx
"use client";

import { useState, useMemo } from "react";
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
  Pencil 
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
  onEditTag: (tag: TagItem) => void; // Nouvelle prop pour l'édition
  onSearch: (query: string) => void;
  viewMode: "cloud" | "list";
  onViewModeChange: (mode: "cloud" | "list") => void;
  onCreateTagClick: () => void;
}

export default function TagsManager({
  tags,
  onDeleteTag,
  onEditTag, // Nouvelle prop
  onSearch,
  viewMode,
  onViewModeChange,
  onCreateTagClick,
}: TagsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // --- LOGIQUE DE CALCUL ---

  // Filtrage par recherche
  const filteredTags = useMemo(() => {
    const filtered = tags.filter(tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered;
  }, [tags, searchQuery]);

  // Tags Tendance (Extraits de la liste globale filtrée ou non)
  const trendingTags = useMemo(() => {
    return tags.filter(tag => tag.trending).sort((a, b) => b.count - a.count);
  }, [tags]);

  // Tri par utilisation (décroissant)
  const sortedTags = useMemo(() => {
    return [...filteredTags].sort((a, b) => b.count - a.count);
  }, [filteredTags]);

  // Utilisation totale (somme de tous les articles liés)
  const totalUsage = useMemo(() => {
    return tags.reduce((sum, tag) => sum + tag.count, 0);
  }, [tags]);

  // Détermination de la taille maximale pour le ratio du nuage
  const maxCount = useMemo(() => {
    return tags.length > 0 ? Math.max(...tags.map(t => t.count)) : 0;
  }, [tags]);

  // --- HELPERS UI ---

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onSearch(val);
  };

  const getTagSizeClass = (count: number) => {
    if (maxCount === 0) return "text-sm px-3 py-1";
    const ratio = count / maxCount;
    if (ratio > 0.8) return "text-2xl font-bold px-6 py-3 shadow-md";
    if (ratio > 0.5) return "text-xl font-semibold px-5 py-2";
    if (ratio > 0.2) return "text-base font-medium px-4 py-1.5";
    return "text-sm px-3 py-1";
  };

  const getTagColor = (tag: TagItem) => {
    if (tag.color) return tag.color;
    if (tag.trending) return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Tags',       value: tags.length,         gradient: 'from-blue-500 to-blue-600',   icon: <TagIcon size={18} /> },
          { label: 'Tags Tendance',    value: trendingTags.length, gradient: 'from-green-500 to-green-600', icon: <TrendingUp size={18} /> },
          { label: 'Utilisation totale', value: totalUsage,        gradient: 'from-purple-500 to-purple-600', icon: <Hash size={18} /> },
        ].map(({ label, value, gradient, icon }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
          </div>
        ))}
      </div>

      {/* SECTION 2: CONTROLS (SEARCH & VIEW) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un tag (ex: #react)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#168F6F] outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => onViewModeChange("cloud")}
              className={`p-2 rounded-lg transition-all ${viewMode === "cloud" ? "bg-white dark:bg-gray-700 shadow-sm text-[#168F6F]" : "text-gray-500 hover:text-gray-700"}`}
              title="Vue Nuage"
            >
              <Cloud className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm text-[#168F6F]" : "text-gray-500 hover:text-gray-700"}`}
              title="Vue Liste"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={onCreateTagClick}
            className="flex items-center gap-2 px-5 py-3 bg-[#168F6F] hover:bg-[#0e6b52] text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nouveau Tag
          </button>
        </div>
      </div>

      {/* SECTION 3: TRENDING QUICK ACCESS */}
      <AnimatePresence>
        {trendingTags.length > 0 && searchQuery === "" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Tags les plus utilisés
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.slice(0, 5).map(tag => (
                  <span key={tag.id} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-bold text-[#168F6F] dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50">
                    {tag.name} <span className="ml-1 opacity-60">{tag.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 4: MAIN DISPLAY */}
      <div className="min-h-[400px]">
        {viewMode === "cloud" ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-center gap-6">
            {sortedTags.length > 0 ? (
              sortedTags.map((tag, idx) => (
                <motion.div
                  key={tag.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative"
                >
                  <div
                    className={`${getTagSizeClass(tag.count)} ${getTagColor(tag)} rounded-2xl transition-all duration-300 flex items-center gap-2`}
                  >
                    <Hash className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    {tag.name}
                    <span className="text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                      {tag.count}
                    </span>
                  </div>
                  
                  {/* Boutons d'action au survol (version nuage) */}
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditTag(tag)}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                      title="Modifier le tag"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteTag(tag.id)}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                      title="Supprimer le tag"
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
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedTags.length > 0 ? (
                sortedTags.map((tag, idx) => (
                  <motion.div
                    key={tag.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTagColor(tag)}`}>
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {tag.name}
                          {tag.trending && <TrendingUp className="w-3 h-3 text-green-500" />}
                        </p>
                        <p className="text-xs text-gray-500">{tag.count} article(s) lié(s)</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Bouton d'édition */}
                      <button
                        onClick={() => onEditTag(tag)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Modifier le tag"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      
                      {/* Bouton de suppression */}
                      <button
                        onClick={() => onDeleteTag(tag.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Supprimer le tag"
                      >
                        <X className="w-5 h-5" />
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
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-300">
        <Search className="w-10 h-10" />
      </div>
      <div>
        <p className="text-gray-900 dark:text-white font-medium">Aucun tag trouvé</p>
        <p className="text-sm text-gray-500">Essayez une autre recherche ou créez-en un nouveau.</p>
      </div>
    </div>
  );
}