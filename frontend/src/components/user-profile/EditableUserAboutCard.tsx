'use client';

import { MapPin, Calendar, Globe, Mail, Phone, Building } from 'lucide-react';

interface EditableUserAboutCardProps {
  user: {
    bio?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    joinDate?: string;
    website?: string;
    email?: string;
    phone?: string | null;
    department?: string | null;
  };
  isCurrentUser?: boolean;
}

export default function EditableUserAboutCard({ user, isCurrentUser = false }: EditableUserAboutCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        {isCurrentUser ? 'Mes Informations' : 'À propos'}
      </h3>

      <div className="space-y-4">
        {user.bio ? (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{user.bio}</p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 italic">
            {isCurrentUser ? 'Ajoutez une biographie' : 'Aucune biographie disponible'}
          </p>
        )}

        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">

          {user.email && (
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Email</p>
                <a href={`mailto:${user.email}`}
                  className="text-sm text-[#168F6F] hover:underline truncate block">
                  {user.email}
                </a>
              </div>
            </div>
          )}

          {user.phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Téléphone</p>
                <a href={`tel:${user.phone}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#168F6F] dark:hover:text-[#00B383] transition-colors">
                  {user.phone}
                </a>
              </div>
            </div>
          )}

          {user.department && (
            <div className="flex items-center gap-3">
              <Building size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Département</p>
                <span className="text-sm text-gray-600 dark:text-gray-400">{user.department}</span>
              </div>
            </div>
          )}

          {(user.city || user.country || user.postalCode) && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Localisation</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                  {user.city && <div>{user.city}</div>}
                  {user.postalCode && <div>{user.postalCode}</div>}
                  {user.country && <div>{user.country}</div>}
                </div>
              </div>
            </div>
          )}

          {user.joinDate && (
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Membre depuis</p>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(user.joinDate)}
                </span>
              </div>
            </div>
          )}

          {user.website && (
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-[#168F6F] dark:text-[#00B383] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Site web</p>
                <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[#168F6F] dark:text-[#00B383] hover:underline truncate block">
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}