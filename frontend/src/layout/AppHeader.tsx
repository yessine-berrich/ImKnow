"use client";

import { getToken } from '../../services/auth.service';
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import CreatePublicationModal from "@/components/modals/CreatePublicationModal";
import AIAssistant from "@/components/ia-assistant/AIAssistant";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Plus, Menu, BookOpen, Sparkles } from "lucide-react";
import MessageDropdown from "@/components/header/MessageDropdown";
import DraftPublicationsModal from "@/components/modals/Draftpublicationsmodal";
import Avatar from "@/components/ui/avatar/Avatar";
import { useTranslation } from "@/context/LanguageContext";

// Interface pour les résultats de recherche (adaptée au format du backend)
interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contentPreview?: string;
  author?: any;
  category?: any;
  tags?: any[];
  viewsCount?: number;
  likesCount?: number;
  similarity?: number;
  createdAt?: string;
  publicationsCount?: number;
  description?: string;
  bio?: string;
  department?: string;
  country?: string;
  profileImage?: string;
}

interface GlobalSearchResponse {
  query: string;
  publications: SearchResult[];
  categories: SearchResult[];
  tags: SearchResult[];
  users: SearchResult[];
  totalResults: number;
}

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // ── Recherche sémantique ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar, isExpanded } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [isDraftModalOpen, setDraftModalOpen] = useState(false);

  // Toggle sidebar
  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // Raccourci clavier ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === "Escape") {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fermer les résultats quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recherche globale – appel API
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        return;
      }

      setIsSearching(true);

      try {
        const token = getToken();
        if (!token) {
          console.warn("Non authentifié");
          return;
        }

        const params = new URLSearchParams({
          query: searchQuery.trim(),
          limitPerType: "5",
          minSimilarity: "0.65",
        });

        const res = await fetch(`http://localhost:3000/api/search?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`);
        }

        const data = await res.json();
        console.log("Résultats de recherche:", data);
        setSearchResults(data);
      } catch (err) {
        console.error("Erreur recherche:", err);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fonction pour gérer la navigation selon le type de résultat
  const handleResultClick = (result: SearchResult, type: 'publication' | 'category' | 'tag' | 'user') => {
    setShowResults(false);
    setSearchQuery("");

    switch (type) {
      case 'publication':
        router.push(`/home?publication=${result.id}`);
        break;
      case 'user':
        router.push(`/profile/${result.id}`);
        break;
      case 'category':
        router.push(`/categories/${result.id}/publications`);
        break;
      case 'tag':
        router.push(`/tags/${result.id}/publications`);
        break;
    }
  };

  // Compter le nombre total de résultats
  const totalResults = searchResults
    ? (searchResults.publications?.length || 0) +
    (searchResults.categories?.length || 0) +
    (searchResults.tags?.length || 0) +
    (searchResults.users?.length || 0)
    : 0;

  return (
    <>
      <header className="sticky top-0 flex w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 dark:bg-gray-900/80 dark:border-gray-800 lg:border-b">
        <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
          <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">

            {/* BOUTON POUR PLIER/DÉPLIER LA SIDEBAR */}
            <button
              onClick={handleToggle}
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
              aria-label="Toggle sidebar"
            >
              <Menu
                size={20}
                className={`text-gray-600 dark:text-gray-400 transition-transform duration-300 ${!isExpanded ? 'rotate-180' : ''
                  }`}
              />
            </button>

            <Link href="/" className="lg:hidden">
              <Image
                className="dark:hidden"
                src="/images/logo/logo-2.jpeg"
                alt="Logo"
                width={120}
                height={32}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-2.jpeg"
                alt="Logo"
                width={120}
                height={32}
              />
            </Link>

            {/* ── Barre de recherche ── */}
            <div className="relative w-full max-w-xl lg:block">
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                  <svg
                    className="fill-gray-500 dark:fill-gray-400"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.327 15.417L17.3779 18.4667C17.6708 18.7595 18.1457 18.7595 18.4386 18.4667C18.7315 18.1739 18.7315 17.6992 18.4386 17.4064L15.3877 14.3567C16.5052 13.0333 17.1751 11.2987 17.1751 9.37363C17.1751 5.04817 13.6678 1.54199 9.34175 1.54199H9.37508Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>

                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder={t('header.search_placeholder')}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />

                <div className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>

              {/* Liste des résultats */}
              {showResults && (searchQuery.trim() || totalResults > 0) && (
                <div
                  ref={resultsRef}
                  className="absolute left-0 right-0 z-50 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-[70vh] overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {t('header.searching')}
                    </div>
                  ) : !searchResults || totalResults === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery.trim()
                        ? t('header.no_results')
                        : t('header.start_typing')}
                    </div>
                  ) : (
                    <div className="py-2">
                      {/* PUBLICATIONS */}
                      {searchResults.publications && searchResults.publications.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            {t('header.section_publications', { count: searchResults.publications.length })}
                          </div>
                          {searchResults.publications.map((publication) => (
                            <button
                              key={`publication-${publication.id}`}
                              onClick={() => handleResultClick(publication, 'publication')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">
                                {publication.title}
                              </span>
                              {publication.contentPreview && (
                                <span className="block text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                  {publication.contentPreview}
                                </span>
                              )}
                              {publication.similarity !== undefined && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {t('header.relevance', { percent: (publication.similarity * 100).toFixed(0) })}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* UTILISATEURS */}
                      {searchResults.users && searchResults.users.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            {t('header.section_users', { count: searchResults.users.length })}
                          </div>
                          {searchResults.users.map((user) => (
                            <button
                              key={`user-${user.id}`}
                              onClick={() => handleResultClick(user, 'user')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 flex items-center gap-3"
                            >
                              <Avatar
                                src={user.profileImage}
                                alt={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || t('user_dropdown.user_label')}
                                size="small"
                              />
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {user.firstName} {user.lastName}
                                </span>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                  {user.email} {user.department && `• ${user.department}`}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* CATÉGORIES */}
                      {searchResults.categories && searchResults.categories.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            {t('header.section_categories', { count: searchResults.categories.length })}
                          </div>
                          {searchResults.categories.map((category) => (
                            <button
                              key={`category-${category.id}`}
                              onClick={() => handleResultClick(category, 'category')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">
                                {category.name}
                              </span>
                              {category.description && (
                                <span className="block text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                  {category.description}
                                </span>
                              )}
                              {category.publicationsCount !== undefined && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {t(category.publicationsCount > 1 ? 'header.publication_count_plural' : 'header.publication_count_one', { count: category.publicationsCount })}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* TAGS */}
                      {searchResults.tags && searchResults.tags.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            {t('header.section_tags', { count: searchResults.tags.length })}
                          </div>
                          {searchResults.tags.map((tag) => (
                            <button
                              key={`tag-${tag.id}`}
                              onClick={() => handleResultClick(tag, 'tag')}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">
                                {tag.name}
                              </span>
                              {tag.publicationsCount !== undefined && (
                                <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                  {t(tag.publicationsCount > 1 ? 'header.publication_count_plural' : 'header.publication_count_one', { count: tag.publicationsCount })}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bouton menu mobile */}
            <button
              onClick={toggleApplicationMenu}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Partie droite (notifications, user, dark mode) */}
          <div
            className={`${isApplicationMenuOpen ? "flex" : "hidden"
              } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
          >
            <div className="flex items-center gap-2 2xsm:gap-3">
              {/* Bouton AI Assistant */}
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="relative flex items-center justify-center h-11 w-11 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-500 transition-colors hover:bg-[#168F6F]/10 hover:text-[#168F6F] hover:border-[#168F6F]/30 dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-[#168F6F]/20 dark:hover:text-[#168F6F]"
                title={t('header.ai_assistant')}
              >
                <Sparkles size={20} />
              </button>

              {/* Bouton Brouillons */}
              <button
                onClick={() => setDraftModalOpen(true)}
                className="relative flex items-center justify-center h-11 w-11 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                title={t('header.my_drafts')}
              >
                <BookOpen size={20} />
              </button>

              {/* Bouton Créer un publication */}
              <button
                onClick={() => setCreateModalOpen(true)}
                className="relative flex items-center justify-center h-11 w-11 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                title={t('header.add_publication')}
              >
                <Plus size={20} />
              </button>

              {/* Bouton Thème */}
              {/* <div className="hidden sm:block">
                <ThemeToggleButton />
              </div> */}

              <MessageDropdown />
              <NotificationDropdown />
            </div>
            <UserDropdown />
          </div>
        </div>
      </header>

      <CreatePublicationModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
      <DraftPublicationsModal
        isOpen={isDraftModalOpen}
        onClose={() => setDraftModalOpen(false)}
      />

      {/* AI Assistant Modal */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
      />
    </>
  );
};

export default AppHeader;
