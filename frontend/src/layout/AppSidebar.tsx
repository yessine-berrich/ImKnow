// components/AppSidebar.tsx
"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from '../../services/auth.service';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import {
  Home,
  Calendar,
  Tag,
  Folder,
  Users,
  ChartArea,
  LucideBookHeart,
  MessageCircle,
  Bookmark,
  Shield,
  Settings,
  LogOut,
  ActivityIcon,
  Terminal,
  ArchiveIcon,
  XCircle,
  UserRoundCog,
  TrendingUp,
  ChevronDown,
  Heart,
  Flag
} from 'lucide-react';
import SidebarWidget from "./SidebarWidget";
import { statsService, EmployeeTrendingTag } from "../../services/stats.service";
import { useTranslation } from "../context/LanguageContext";

// Type pour une catégorie
type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    icon?: React.ReactNode;
  }[];
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    icon: <Home className="w-5 h-5" />,
    name: "sidebar.nav_home",
    path: "/home",
    adminOnly: false,
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    name: "sidebar.nav_chat",
    path: "/chat",
    adminOnly: false,
  },
  {
    name: "sidebar.nav_activities",
    icon: <ActivityIcon />,
    adminOnly: false,
    subItems: [
      {
        name: "sidebar.nav_likes",
        path: "/liked",
        pro: false,
        icon: <Heart className="w-4 h-4" />
      },
      {
        name: "sidebar.nav_comments",
        path: "/commented",
        pro: false,
        icon: <MessageCircle className="w-4 h-4" />
      },
      {
        name: "sidebar.nav_bookmarks",
        path: "/bookmarked",
        pro: false,
        icon: <Bookmark className="w-4 h-4" />
      },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "sidebar.nav_profile",
    path: "/profile",
    adminOnly: false,
  },
  {
    icon: <Users />,
    name: "sidebar.nav_connections",
    path: "/connections",
    adminOnly: false,
  },
  {
    icon: <Settings className="w-5 h-5" />,
    name: "sidebar.nav_settings",
    path: "/settings",
    adminOnly: false,
  },
];

const othersItems: NavItem[] = [
  {
    icon: <Tag className="w-5 h-5" />,
    name: "sidebar.nav_tags",
    path: "/tags",
    adminOnly: true,
  },
  {
    icon: <Folder className="w-5 h-5" />,
    name: "sidebar.nav_categories",
    path: "/categories",
    adminOnly: true,
  },
  {
    icon: <UserRoundCog className="w-5 h-5" />,
    name: "sidebar.nav_users",
    path: "/users",
    adminOnly: true,
  },
  {
    name: "sidebar.nav_rejected",
    icon: <XCircle />,
    adminOnly: true,
    subItems: [
      { name: "sidebar.nav_rejected_duplicated", path: "/rejected/duplicated", pro: false },
      { name: "sidebar.nav_rejected_moderation", path: "/rejected/moderation", pro: false },
    ],
  },
  {
    name: "sidebar.nav_reports",
    icon: <Flag className="w-5 h-5" />,
    adminOnly: true,
    subItems: [
      { name: "sidebar.nav_reported_articles", path: "/reported/reported-articles", pro: false },
      { name: "sidebar.nav_reported_users", path: "/reported/reported-users", pro: false },
    ],
  },
  {
    icon: <ChartArea className="w-5 h-5" />,
    name: "sidebar.nav_statistics",
    path: "/statistics",
    adminOnly: true,
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { t } = useTranslation();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ État pour stocker les catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);

  // ✅ État pour stocker les trending tags
  const [trendingTags, setTrendingTags] = useState<EmployeeTrendingTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);

  // ✅ États pour les sous-menus déroulants
  const [isCategoriesOpen, setIsCategoriesOpen] = useState<boolean>(true);
  const [isTagsOpen, setIsTagsOpen] = useState<boolean>(true);

  // ✅ Récupérer le rôle depuis le token
  useEffect(() => {
    const checkUserRole = () => {
      try {
        const token = getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('👤 Rôle utilisateur:', payload.role);
          setIsAdmin(payload.role === 'ADMIN');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ Erreur de décodage du token:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();

    const handleStorageChange = () => {
      checkUserRole();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ Récupérer les catégories (accessible à tous les utilisateurs)
  useEffect(() => {
    const fetchCategories = async () => {
      if (isLoading) return;

      setIsLoadingCategories(true);
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch('http://localhost:3000/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`);
        }

        const data = await res.json();
        console.log('📚 Catégories chargées:', data);
        setCategories(data);
      } catch (err) {
        console.error('❌ Erreur chargement catégories sidebar:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isLoading]);

  // ✅ Récupérer les trending tags
  useEffect(() => {
    const fetchTrendingTags = async () => {
      if (isLoading) return;

      setIsLoadingTags(true);
      try {
        const tags = await statsService.getTrendingTagsForEmployees(5);
        console.log('🏷️ Trending tags chargés:', tags);
        setTrendingTags(tags);
      } catch (err) {
        console.error('❌ Erreur chargement trending tags sidebar:', err);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTrendingTags();
  }, [isLoading]);

  const filterItemsByRole = useCallback((items: NavItem[]) => {
    if (isLoading) return [];

    return items.filter(item => {
      return !item.adminOnly || isAdmin;
    });
  }, [isAdmin, isLoading]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const isCategoryActive = useCallback((categoryId: string) => {
    return pathname === `/categories/${categoryId}/articles`;
  }, [pathname]);

  const isTagActive = useCallback((tagId: number) => {
    return pathname === `/tags/${tagId}/articles`;
  }, [pathname]);

  // ✅ Gérer l'ouverture des sous-menus
  useEffect(() => {
    let submenuMatched = false;

    const checkActiveSubmenu = (items: NavItem[], type: "main" | "others") => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type, index });
              submenuMatched = true;
            }
          });
        }
      });
    };

    const filteredMainItems = filterItemsByRole(navItems);
    const filteredOthersItems = filterItemsByRole(othersItems);

    checkActiveSubmenu(filteredMainItems, "main");
    checkActiveSubmenu(filteredOthersItems, "others");

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, filterItemsByRole]);

  // ✅ Mettre à jour la hauteur des sous-menus
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others"
  ) => {
    const filteredItems = filterItemsByRole(items);

    if (filteredItems.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
          {t('sidebar.no_items')}
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-4">
        {filteredItems.map((nav, index) => (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                  } cursor-pointer ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  }`}
              >
                <span
                  className={`${openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{t(nav.name)}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                      }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                    }`}
                >
                  <span
                    className={`${isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{t(nav.name)}</span>
                  )}
                </Link>
              )
            )}

            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.path}
                        className={`menu-dropdown-item ${isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                          }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {subItem.icon && (
                            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                              {subItem.icon}
                            </span>
                          )}
                          <span className="flex-1">{t(subItem.name)}</span>
                          <div className="flex items-center gap-1">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge`}
                              >
                                new
                              </span>
                            )}
                            {subItem.pro && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge`}
                              >
                                pro
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Fonction pour obtenir l'icône de tendance
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-500 transform rotate-180" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  // ✅ Rendu des catégories - sous-menu déroulant avec icône toujours visible
  const renderCategories = () => {
    // En mode réduit : afficher juste l'icône
    if (!isExpanded && !isHovered && !isMobileOpen) {
      return (
        <div className="mt-4">
          <div className="menu-item group lg:justify-center">
            <span className="menu-item-icon-inactive">
              <Folder className="w-5 h-5" />
            </span>
          </div>
        </div>
      );
    }

    if (isLoadingCategories) return null;

    const hasCategories = categories.length > 0;

    return (
      <div className="mt-4">
        <button
          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
          className={`menu-item group w-full cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
            } ${isCategoriesOpen ? "menu-item-active" : "menu-item-inactive"}`}
        >
          <span className="menu-item-icon-inactive">
            <Folder className="w-5 h-5" />
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <>
              <span className="menu-item-text">{t('sidebar.categories_label')}</span>
              <ChevronDown
                className={`ml-auto w-5 h-5 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180" : ""
                  }`}
              />
            </>
          )}
        </button>

        {(isExpanded || isHovered || isMobileOpen) && isCategoriesOpen && (
          <div className="overflow-hidden transition-all duration-300">
            <ul className="mt-2 space-y-1 ml-9">
              {hasCategories ? (
                categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/categories/${category.id}/articles`}
                      className={`menu-dropdown-item ${isCategoryActive(category.id)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 dark:text-gray-400 text-sm py-2 px-3">
                  {t('sidebar.no_categories')}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ✅ Rendu des trending tags - sous-menu déroulant avec icône toujours visible
  const renderTrendingTags = () => {
    // En mode réduit : afficher juste l'icône
    if (!isExpanded && !isHovered && !isMobileOpen) {
      return (
        <div className="mt-2">
          <div className="menu-item group lg:justify-center">
            <span className="menu-item-icon-inactive">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
        </div>
      );
    }

    if (isLoadingTags) return null;

    const hasTags = trendingTags.length > 0;

    return (
      <div className="mt-2">
        <button
          onClick={() => setIsTagsOpen(!isTagsOpen)}
          className={`menu-item group w-full cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
            } ${isTagsOpen ? "menu-item-active" : "menu-item-inactive"}`}
        >
          <span className="menu-item-icon-inactive">
            <TrendingUp className="w-5 h-5" />
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <>
              <span className="menu-item-text">{t('sidebar.trending_tags_label')}</span>
              <ChevronDown
                className={`ml-auto w-5 h-5 transition-transform duration-200 ${isTagsOpen ? "rotate-180" : ""
                  }`}
              />
            </>
          )}
        </button>

        {(isExpanded || isHovered || isMobileOpen) && isTagsOpen && (
          <div className="overflow-hidden transition-all duration-300">
            <ul className="mt-2 space-y-1 ml-9">
              {hasTags ? (
                trendingTags.map((tag) => (
                  <li key={tag.id}>
                    <Link
                      href={`/tags/${tag.id}/articles`}
                      className={`menu-dropdown-item ${isTagActive(tag.id)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        } flex items-center justify-between`}
                    >
                      <span className="truncate">{tag.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-500">
                          {tag.articleCount}
                        </span>
                        {getTrendIcon(tag.trend)}
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 dark:text-gray-400 text-sm py-2 px-3">
                  {t('sidebar.no_trending_tags')}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Squelette de chargement
  if (isLoading) {
    return (
      <aside className="fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 h-screen border-r border-gray-200 dark:border-gray-800 w-[290px]">
        <div className="py-8">
          <div className="w-[150px] h-10 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`py-6 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/home" className={!isExpanded && !isHovered ? "lg:mx-auto" : "ml-4"}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo-2.jpeg"
                alt="Logo"
                width={180}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-2.jpeg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-1.png"
              alt="Logo"
              width={50}
              height={32}
              className="mx-auto"
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Section Administration (admin seulement) — en haut */}
            {isAdmin && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
                >
                  {isExpanded || isHovered || isMobileOpen ? t('sidebar.admin_section') : <HorizontaLDots />}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}

            {/* Menu principal */}
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
              >
                {isExpanded || isHovered || isMobileOpen ? t('sidebar.menu_section') : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            {/* Section Catégories */}
            {renderCategories()}

            {/* Section Tags tendances */}
            {renderTrendingTags()}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;