// app/(admin)/(others-pages)/(users)/users/page.tsx
'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UsersTable from '@/components/tables/UsersTable';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE';
  isEmailActive: boolean;
  status: 'actif' | 'inactif' | 'pending';
  createdAt: string;
  updatedAt: string;
  articles?: any[];
  _count?: {
    articles: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔑 Payload décodé:', payload); // Temporaire pour debug
      
      // ✅ DÉFINIR currentUserId AVANT de fetchUsers
      setCurrentUserId(payload.sub);
      setCurrentUserRole(payload.role);

      // VÉRIFICATION DU RÔLE - Redirection vers /403 si pas ADMIN ou SUPERADMIN
      if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
        router.push('/error-403');
        return;
      }

      setIsCheckingRole(false);
    } catch (err) {
      console.error('❌ Erreur token:', err);
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  }, [router]);

  // ✅ NOUVEAU useEffect séparé pour fetchUsers
  useEffect(() => {
    if (!isCheckingRole && currentUserId) {
      fetchUsers();
    }
  }, [isCheckingRole, currentUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      console.log('🔄 Chargement des utilisateurs, currentUserId:', currentUserId); // Temporaire pour debug

      const response = await fetch('http://localhost:3000/api/users?include=articles', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // GESTION DES ERREURS
      if (response.status === 403) {
        router.push('/error-403');
        return;
      }

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: User[] = await response.json();
      
      // ✅ FILTRER POUR EXCLURE L'UTILISATEUR COURANT
      const otherUsers = data.filter(user => {
        const shouldKeep = user.id !== currentUserId;
        if (!shouldKeep) {
          console.log('🚫 Utilisateur courant exclu:', user.id, user.email); // Temporaire pour debug
        }
        return shouldKeep;
      });
      
      console.log('📊 Utilisateurs après filtrage:', otherUsers.length); // Temporaire pour debug
      
      const transformed = otherUsers.map((user) => {
        // Map backend enum + isEmailActive to frontend display status
        let userStatus: 'active' | 'inactive' | 'pending' | 'email_unverified';

        if (!user.isEmailActive) {
          userStatus = 'email_unverified';   // email not verified yet
        } else if (user.status === 'actif') {
          userStatus = 'active';
        } else if (user.status === 'inactif') {
          userStatus = 'inactive';           // admin deactivated
        } else {
          userStatus = 'pending';            // waiting for admin activation
        }

        const articleCount = user.articles?.length || user._count?.articles || 0;
        
        return {
          id: user.id.toString(),
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
          email: user.email,
          avatar: user.profileImage,
          userId: user.id,
          role: user.role,
          status: userStatus,
          articles: articleCount,
          joinedAt: new Date(user.createdAt).toLocaleDateString('fr-FR', { 
            month: 'short', 
            year: 'numeric' 
          }),
          lastActive: user.updatedAt ? getTimeAgo(user.updatedAt) : 'Jamais',
        };
      });

      setUsers(transformed);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffInMs / 60000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Vérification du rôle en cours
  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Vérification des accès...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez patienter
          </p>
        </div>
      </div>
    );
  }

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#168F6F] mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Chargement des utilisateurs...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez patienter
          </p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={fetchUsers}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <RefreshCw size={18} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Succès - Affichage normal
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <UsersTable
        users={users}
        onRefresh={fetchUsers}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        title="Gestion des Utilisateurs"
        description="Gérez les accès, rôles et permissions des membres de votre organisation"
      />
    </div>
  );
}