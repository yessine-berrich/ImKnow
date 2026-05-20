// components/tables/UsersTable.tsx
'use client';
import { getToken } from '../../../services/auth.service';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2, Eye, UserCheck, UserX, Mail, Shield, MoreVertical,
  ChevronLeft, ChevronRight, ArrowUpDown, Send, Power,
  Loader2, CheckCircle
} from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import UsersFilter, { FilterValues } from '../Filter/UsersFilter';
import Avatar from '../ui/avatar/Avatar';
import { useTranslation } from '@/context/LanguageContext';

export interface UserTableItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE';
  status: 'active' | 'inactive' | 'pending' | 'email_unverified';
  publications: number;
  joinedAt: string;
  lastActive: string;
}

interface UsersTableProps {
  users: UserTableItem[];
  onRefresh: () => void;
  title?: string;
  description?: string;
  currentUserId?: number | null;
  currentUserRole?: string | null;
}

export default function UsersTable({
  users: initialUsers,
  onRefresh,
  title,
  description,
  currentUserId,
  currentUserRole,
}: UsersTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [filters, setFilters] = useState<FilterValues>({ search: '', role: '', status: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserTableItem; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openRoleMenuId, setOpenRoleMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setOpenRoleMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuOpen = (userId: string, event: React.MouseEvent, index: number) => {
    setMenuPosition(index >= 5 ? 'top' : 'bottom');
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  const apiCall = async (endpoint: string, method: string = 'POST', body?: any) => {
    const token = getToken();
    if (!token) throw new Error(t('users_page.not_authenticated'));

    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      router.push('/login');
      throw new Error(t('users_page.session_expired'));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur ${response.status}`);
    }

    return response.json();
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!await confirm(t('users_page.delete_confirm', { name }))) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await apiCall(`/api/users/admin/${id}`, 'DELETE');
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success(t('users_page.toast_deleted'));
      setOpenMenuId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(`❌ ${err.message || t('users_page.toast_error_delete')}`);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleActivate = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await apiCall(`/api/users/admin/${id}/activate`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' as any } : u));
      toast.success(t('users_page.toast_activated'));
      setOpenMenuId(null);
    } catch (err: any) {
      toast.error(`❌ ${err.message || t('users_page.toast_error_activate')}`);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeactivate = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await apiCall(`/api/users/admin/${id}/deactivate`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'inactive' as any } : u));
      toast.success(t('users_page.toast_deactivated'));
      setOpenMenuId(null);
    } catch (err: any) {
      toast.error(`❌ ${err.message || t('users_page.toast_error_deactivate')}`);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleChangeRole = async (id: string, newRole: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE', currentRole: string) => {
    if (newRole === currentRole) { setOpenRoleMenuId(null); return; }

    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await apiCall(`/api/users/admin/users/${id}/role`, 'POST', { role: newRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      toast.success(t('users_page.toast_role_changed'));
      setOpenRoleMenuId(null);
      setOpenMenuId(null);
    } catch (err: any) {
      toast.error(`❌ ${err.message || t('users_page.toast_error_role')}`);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    setOpenMenuId(null);
  };

  const navigateToUserProfile = (userId: string) => {
    const route = currentUserId && currentUserId.toString() === userId ? '/profile' : `/profile/${userId}`;
    router.push(route);
    setOpenMenuId(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!user.name.toLowerCase().includes(s) && !user.email.toLowerCase().includes(s)) return false;
      }
      if (filters.role && user.role !== filters.role) return false;
      if (filters.status && user.status !== filters.status) return false;
      return true;
    });
  }, [users, filters]);

  const sortedUsers = useMemo(() => {
    if (!sortConfig) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  const displayUsers = Array(itemsPerPage).fill(null).map((_, i) => currentPageUsers[i] ?? null);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    emailUnverified: users.filter(u => u.status === 'email_unverified').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    employees: users.filter(u => u.role === 'EMPLOYEE').length,
  }), [users]);

  const handleSort = (key: keyof UserTableItem) => {
    if (!sortConfig || sortConfig.key !== key) setSortConfig({ key, direction: 'asc' });
    else if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
    else setSortConfig(null);
  };

  const isSuperAdmin = currentUserRole === 'SUPERADMIN';

  const roleOptions = [
    { value: 'SUPERADMIN', label: t('users_page.role_superadmin_full'), icon: '🛡️', description: t('users_page.role_superadmin_desc'), color: 'text-purple-600 dark:text-purple-400' },
    { value: 'ADMIN',      label: t('users_page.role_admin'),           icon: '👑', description: t('users_page.role_admin_desc'),      color: 'text-red-600 dark:text-red-400'    },
    { value: 'EMPLOYEE',   label: t('users_page.role_employee'),        icon: '👤', description: t('users_page.role_employee_desc'),   color: 'text-[#168F6F]'                    },
  ];

  const renderEmptyRow = (key: number) => (
    <tr key={`empty-${key}`} className="opacity-0 pointer-events-none h-[73px]">
      <td colSpan={7}><div className="invisible">Placeholder</div></td>
    </tr>
  );

  const columns = [
    { key: 'name',        label: t('users_page.col_user')        },
    { key: 'role',        label: t('users_page.col_role')        },
    { key: 'publications',label: t('users_page.col_publications') },
    { key: 'status',      label: t('users_page.col_status')      },
    { key: 'joinedAt',    label: t('users_page.col_joined')      },
    { key: 'lastActive',  label: t('users_page.col_last_active') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {([
          { label: t('users_page.stat_total'),          value: stats.total,          gradient: 'from-blue-500 to-blue-600',    filterKey: null     as string | null, filterVal: ''                 },
          { label: t('users_page.stat_active'),         value: stats.active,         gradient: 'from-green-500 to-green-600',  filterKey: 'status' as string | null, filterVal: 'active'           },
          { label: t('users_page.stat_pending'),        value: stats.pending,        gradient: 'from-yellow-500 to-yellow-600',filterKey: 'status' as string | null, filterVal: 'pending'          },
          { label: t('users_page.stat_email_unverified'),value: stats.emailUnverified,gradient: 'from-orange-400 to-orange-500',filterKey: 'status' as string | null, filterVal: 'email_unverified' },
          { label: t('users_page.stat_inactive'),       value: stats.inactive,       gradient: 'from-red-500 to-red-600',      filterKey: 'status' as string | null, filterVal: 'inactive'         },
          { label: t('users_page.stat_employees'),      value: stats.employees,      gradient: 'from-purple-500 to-purple-600',filterKey: 'role'   as string | null, filterVal: 'EMPLOYEE'         },
        ]).map(({ label, value, gradient, filterKey, filterVal }) => {
          const isActive = filterKey !== null && filters[filterKey as keyof typeof filters] === filterVal;
          return (
            <button
              key={label}
              onClick={() => {
                if (filterKey === null) { setFilters({ search: '', role: '', status: '' }); setCurrentPage(1); }
                else { setFilters(prev => ({ ...prev, [filterKey]: isActive ? '' : filterVal })); setCurrentPage(1); }
              }}
              className={`text-left bg-white dark:bg-gray-900 rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-lg ${
                isActive ? 'border-[#168F6F] shadow-md ring-2 ring-[#168F6F]/20' : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
              {isActive && <p className="text-xs text-[#168F6F] mt-1 font-medium">{t('tables.active_filter')}</p>}
            </button>
          );
        })}
      </div>

      <UsersFilter
        filters={filters}
        onChange={(key, value) => { setFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); }}
        onReset={() => { setFilters({ search: '', role: '', status: '' }); setCurrentPage(1); }}
      />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort(key as keyof UserTableItem)} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      {label} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('tables.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <UserX className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('users_page.empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayUsers.map((user, index) => {
                  if (!user) return renderEmptyRow(index);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigateToUserProfile(user.id)}
                            className="relative group w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#168F6F] to-[#0e6b52] flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                          >
                            <Avatar src={user.avatar} alt={user.name} size="medium" className="!w-full !h-full" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigateToUserProfile(user.id)} className="font-medium text-gray-900 dark:text-white hover:text-[#168F6F] transition-colors truncate block">
                              {user.name}
                            </button>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'SUPERADMIN' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' :
                          user.role === 'ADMIN'      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                          'bg-[#168F6F]/10 text-[#168F6F]'
                        }`}>
                          {user.role === 'SUPERADMIN' ? `🛡️ ${t('users_page.role_superadmin')}` :
                           user.role === 'ADMIN'      ? `👑 ${t('users_page.role_admin')}` :
                           `👤 ${t('users_page.role_employee')}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{user.publications}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 ${
                          user.status === 'active'           ? 'text-green-600 dark:text-green-400' :
                          user.status === 'pending'          ? 'text-yellow-600 dark:text-yellow-400' :
                          user.status === 'email_unverified' ? 'text-orange-500 dark:text-orange-400' :
                          'text-red-500 dark:text-red-400'
                        }`}>
                          {user.status === 'active'           ? <UserCheck size={16} /> :
                           user.status === 'pending'          ? <Mail size={16} /> :
                           user.status === 'email_unverified' ? <Mail size={16} /> :
                           <UserX size={16} />}
                          <span className="text-sm">
                            {user.status === 'active'           ? t('users_page.status_active') :
                             user.status === 'pending'          ? t('users_page.status_pending') :
                             user.status === 'email_unverified' ? t('users_page.status_email_unverified') :
                             t('users_page.status_inactive')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{user.joinedAt}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{user.lastActive}</td>
                      <td className="px-4 py-3">
                        <div className="relative" ref={openMenuId === user.id ? menuRef : undefined}>
                          <button
                            onClick={(e) => handleMenuOpen(user.id, e, index)}
                            disabled={loading[user.id]}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                          >
                            {loading[user.id] ? <Loader2 size={18} className="animate-spin" /> : <MoreVertical size={18} />}
                          </button>

                          {openMenuId === user.id && !loading[user.id] && (
                            <div
                              className={`absolute z-[100] w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 ${
                                menuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                              }`}
                              style={{ left: '50%', transform: 'translateX(-90%)', right: 'auto' }}
                            >
                              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                              </div>

                              <button onClick={() => navigateToUserProfile(user.id)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                <Eye size={16} className="text-gray-400" /> {t('users_page.menu_view_profile')}
                              </button>

                              <button onClick={() => handleSendEmail(user.email)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                <Send size={16} className="text-gray-400" /> {t('users_page.menu_send_email')}
                              </button>

                              {isSuperAdmin && (
                                <>
                                  <div className="relative" ref={openRoleMenuId === user.id ? roleMenuRef : undefined}>
                                    <button
                                      onClick={() => setOpenRoleMenuId(openRoleMenuId === user.id ? null : user.id)}
                                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 justify-between transition-colors"
                                    >
                                      <span className="flex items-center gap-3">
                                        <Shield size={16} className="text-gray-400" />
                                        {t('users_page.menu_change_role')}
                                      </span>
                                      <ChevronLeft size={14} className="text-gray-400" />
                                    </button>

                                    {openRoleMenuId === user.id && (
                                      <div className="absolute right-full top-0 mr-1 w-60 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 z-[101] animate-slideInLeft">
                                        {roleOptions.map((role) => (
                                          <button
                                            key={role.value}
                                            onClick={() => handleChangeRole(user.id, role.value as any, user.role)}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${user.role === role.value ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20' : ''}`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="text-2xl">{role.icon}</span>
                                              <div className="flex-1">
                                                <p className={`font-semibold ${user.role === role.value ? 'text-[#168F6F]' : 'text-gray-900 dark:text-white'}`}>{role.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                                              </div>
                                              {user.role === role.value && <CheckCircle size={18} className="text-[#168F6F] flex-shrink-0" />}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {(user.status === 'inactive' || user.status === 'pending') && (
                                    <button onClick={() => handleActivate(user.id)} className="w-full text-left px-4 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors">
                                      <UserCheck size={16} /> {t('users_page.menu_activate')}
                                    </button>
                                  )}

                                  {(user.status === 'active' || user.status === 'pending') && (
                                    <button onClick={() => handleDeactivate(user.id)} className="w-full text-left px-4 py-2.5 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-3 transition-colors">
                                      <Power size={16} /> {t('users_page.menu_deactivate')}
                                    </button>
                                  )}

                                  {user.id !== currentUserId?.toString() && (
                                    <>
                                      <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                      <button onClick={() => handleDeleteUser(user.id, user.name)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                                        <Trash2 size={16} /> {t('users_page.menu_delete')}
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedUsers.length)} {t('tables.pagination_of')} {sortedUsers.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.2s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
