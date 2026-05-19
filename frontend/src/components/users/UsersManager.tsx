// app/components/users/UsersManager.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users as UsersIcon,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  Crown,
  User,
  CheckCircle,
  XCircle,
  Filter,
  Star,
  TrendingUp,
  MailX,
  Clock,
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'contributor' | 'reader';
  status: 'active' | 'inactive' | 'pending' | 'email_unverified';
  publications: number;
  joinedAt: string;
  lastActive: string;
  department?: string;
}

interface UsersManagerProps {
  users: UserItem[];
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (id: string) => void;
  onToggleStatus: (id: string, newStatus: 'active' | 'inactive') => void;
  onChangeRole: (id: string, newRole: UserItem['role']) => void;
  onInviteUser: () => void;
}

export default function UsersManager({
  users,
  onEditUser,
  onDeleteUser,
  onToggleStatus,
  onChangeRole,
  onInviteUser,
}: UsersManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    admins: users.filter((u) => u.role === 'admin').length,
    pending: users.filter((u) => u.status === 'pending').length,
    emailUnverified: users.filter((u) => u.status === 'email_unverified').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    contributors: users.filter((u) => u.role === 'contributor').length,
    editors: users.filter((u) => u.role === 'editor').length,
  }), [users]);

  const getRoleInfo = (role: UserItem['role']) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Crown };
      case 'editor':
        return { label: 'Éditeur', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Edit };
      case 'contributor':
        return { label: 'Contributeur', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: FileText };
      case 'reader':
        return { label: 'Lecteur', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: User };
    }
  };

  const getStatusInfo = (status: UserItem['status']) => {
    switch (status) {
      case 'active':
        return { label: 'Actif', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500', icon: CheckCircle };
      case 'inactive':
        return { label: 'Inactif', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500', icon: XCircle };
      case 'pending':
        return { label: 'En attente', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500', icon: Clock };
      case 'email_unverified':
        return { label: 'Email non vérifié', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-400', icon: MailX };
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.admins}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.contributors}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contributeurs</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.editors}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Éditeurs</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
          onClick={() => { setStatusFilter('pending'); setShowFilters(true); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all"
          onClick={() => { setStatusFilter('email_unverified'); setShowFilters(true); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.emailUnverified}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email non vérifié</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <MailX className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-red-400 transition-all"
          onClick={() => { setStatusFilter('inactive'); setShowFilters(true); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactifs</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres
            {(roleFilter !== 'all' || statusFilter !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>

          {/* Invite Button */}
          <button
            onClick={onInviteUser}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Inviter
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rôle
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      roleFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    Tous
                  </button>
                  {['admin', 'editor', 'contributor', 'reader'].map((role) => {
                    const roleInfo = getRoleInfo(role as UserItem['role']);
                    return (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                          roleFilter === role
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                      >
                        <roleInfo.icon className="h-3 w-3" />
                        {roleInfo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Statut
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    Tous
                  </button>
                  {(['active', 'pending', 'email_unverified', 'inactive'] as UserItem['status'][]).map((status) => {
                    const statusInfo = getStatusInfo(status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                          statusFilter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${statusInfo.bgColor}`}></div>
                        {statusInfo.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="col-span-4 lg:col-span-3">Utilisateur</div>
          <div className="hidden lg:block col-span-2">Rôle</div>
          <div className="hidden lg:block col-span-2">Statut</div>
          <div className="hidden lg:block col-span-2">Publications</div>
          <div className="hidden lg:block col-span-2">Activité</div>
          <div className="col-span-8 lg:col-span-1 text-right">Actions</div>
        </div>

        {/* Users */}
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user, index) => {
              const roleInfo = getRoleInfo(user.role);
              const statusInfo = getStatusInfo(user.status);
              const RoleIcon = roleInfo.icon;
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  {/* User Info */}
                  <div className="col-span-4 lg:col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {getInitials(user.name)}
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusInfo.bgColor}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        {user.department && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {user.department}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role (desktop) */}
                  <div className="hidden lg:block col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Status (desktop) */}
                  <div className="hidden lg:block col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Publications (desktop) */}
                  <div className="hidden lg:block col-span-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{user.publications}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">publications</span>
                    </div>
                  </div>

                  {/* Activity (desktop) */}
                  <div className="hidden lg:block col-span-2">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 dark:text-white">{user.lastActive}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Membre depuis {user.joinedAt}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Compact View */}
                  <div className="col-span-8 lg:hidden">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        {roleInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{user.publications} publications</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.lastActive}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-12 lg:col-span-1">
                    <div className="flex justify-end">
                      <div className="relative group">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                          <div className="py-1">
                            <button
                              onClick={() => onEditUser(user)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Voir le profil
                            </button>
                            
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              Envoyer un email
                            </button>
                            
                            {/* Change Role Submenu */}
                            <div className="relative group/submenu">
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Changer le rôle
                                </div>
                                <span>›</span>
                              </button>
                              
                              {/* Role Options */}
                              <div className="absolute left-full top-0 ml-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover/submenu:opacity-100 group-hover/submenu:visible">
                                {['admin', 'editor', 'contributor', 'reader'].map((role) => {
                                  const roleOpt = getRoleInfo(role as UserItem['role']);
                                  return (
                                    <button
                                      key={role}
                                      onClick={() => onChangeRole(user.id, role as UserItem['role'])}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <roleOpt.icon className="h-3 w-3" />
                                      {roleOpt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Toggle Status */}
                            <button
                              onClick={() => onToggleStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              {user.status === 'active' ? (
                                <>
                                  <XCircle className="h-4 w-4 text-gray-500" />
                                  Désactiver le compte
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Activer le compte
                                </>
                              )}
                            </button>
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            
                            <button
                              onClick={() => onDeleteUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <UsersIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Aucun utilisateur trouvé
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Essayez de modifier vos filtres de recherche
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div>
            Affichage de <span className="font-medium text-gray-900 dark:text-white">{filteredUsers.length}</span> utilisateurs sur {stats.total}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>{((stats.active / stats.total) * 100).toFixed(1)}% d'utilisateurs actifs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}