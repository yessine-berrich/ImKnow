// components/Filter/UsersFilter.tsx
'use client';

import { Search, Filter, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/context/LanguageContext';

export interface FilterValues {
  search: string;
  role: string;
  status: string;
}

interface UsersFilterProps {
  filters: FilterValues;
  onChange: (key: keyof FilterValues, value: string) => void;
  onReset: () => void;
}

export default function UsersFilter({ filters, onChange, onReset }: UsersFilterProps) {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange('search', searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = Object.values(filters).some(v => v && v !== '');

  const roles = [
    { value: 'SUPERADMIN', label: t('users_page.role_superadmin_full'), color: 'bg-purple-500', icon: '🛡️' },
    { value: 'ADMIN',      label: t('users_page.role_admin'),           color: 'bg-red-500',    icon: '👑' },
    { value: 'EMPLOYEE',   label: t('users_page.role_employee'),        color: 'bg-blue-500',   icon: '👤' },
  ];

  const statuses = [
    { value: 'active',          label: t('users_page.status_active'),             color: 'bg-green-500'  },
    { value: 'pending',         label: t('users_page.status_pending_activation'), color: 'bg-yellow-500' },
    { value: 'email_unverified',label: t('users_page.status_email_unverified'),   color: 'bg-orange-400' },
    { value: 'inactive',        label: t('users_page.status_inactive_full'),      color: 'bg-red-500'    },
  ];

  const getSelectedLabel = (type: string, value: string) => {
    if (!value) return type;
    if (type === 'role') return roles.find(r => r.value === value)?.label ?? t('users_page.col_role');
    if (type === 'status') return statuses.find(s => s.value === value)?.label ?? t('users_page.col_status');
    return type;
  };

  return (
    <div className="flex flex-wrap items-center gap-3" ref={dropdownRef}>
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t('users_page.filter_search_placeholder')}
          className="pl-9 pr-8 py-2.5 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        {searchValue && (
          <button onClick={() => { setSearchValue(''); onChange('search', ''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Role Filter */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 min-w-[180px] justify-between transition-all ${
            filters.role ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {filters.role ? getSelectedLabel('role', filters.role) : t('users_page.filter_all_roles')}
            </span>
          </span>
          {filters.role && (
            <button onClick={(e) => { e.stopPropagation(); onChange('role', ''); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-3 w-3" />
            </button>
          )}
        </button>
        {openDropdown === 'role' && (
          <div className="absolute z-20 mt-2 w-full min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1 animate-fadeIn">
            <button
              onClick={() => { onChange('role', ''); setOpenDropdown(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!filters.role ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {t('users_page.filter_all_roles')}
            </button>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => { onChange('role', role.value); setOpenDropdown(null); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${filters.role === role.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${role.color}`} />
                  <span>{role.icon}</span>
                  <span>{role.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 min-w-[180px] justify-between transition-all ${
            filters.status ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {filters.status ? getSelectedLabel('status', filters.status) : t('users_page.filter_all_statuses')}
            </span>
          </span>
          {filters.status && (
            <button onClick={(e) => { e.stopPropagation(); onChange('status', ''); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-3 w-3" />
            </button>
          )}
        </button>
        {openDropdown === 'status' && (
          <div className="absolute z-20 mt-2 w-full min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1 animate-fadeIn">
            <button
              onClick={() => { onChange('status', ''); setOpenDropdown(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!filters.status ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {t('users_page.filter_all_statuses')}
            </button>
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => { onChange('status', status.value); setOpenDropdown(null); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${filters.status === status.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                  {status.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button onClick={onReset} className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium">
          {t('users_page.filter_reset')}
        </button>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
