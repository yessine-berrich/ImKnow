'use client';

import { Heart, MessageCircle, Eye, Edit, Camera } from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { useState, useMemo, useEffect } from 'react';
import Avatar from '../ui/avatar/Avatar';
import { resolveProfileImageSrc } from '@/utils/profile-image';
import { useTranslation } from '@/context/LanguageContext';

interface EditableUserProfileHeaderProps {
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
    role: string;
    department: string;
    email?: string;
  };
  stats: {
    totalPublications: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
  };
  isCurrentUser?: boolean;
  onEditClick?: () => void;
  onImageChange?: (file: File) => void;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onFriendsClick?: () => void;
}

export default function EditableUserProfileHeader({
  user,
  stats,
  isCurrentUser = false,
  onEditClick,
  onImageChange,
  followersCount = 0,
  followingCount = 0,
  friendsCount = 0,
  onFollowersClick,
  onFollowingClick,
  onFriendsClick,
}: EditableUserProfileHeaderProps) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Revoke blob URL created for local file preview when it changes
  useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  // Resolve the stored path to a full URL (works for both /uploads/... and legacy https://...)
  const resolvedProfileImage = useMemo(
    () => resolveProfileImageSrc(user.profileImage),
    [user.profileImage],
  );

  // Preview takes priority; fall back to the server-stored image
  const displayImage = previewImage ?? resolvedProfileImage ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile_header.image_too_large'));
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile_header.unsupported_format'));
      return;
    }

    if (previewImage) URL.revokeObjectURL(previewImage);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    onImageChange?.(file);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="relative inline-block"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <Avatar
              src={displayImage}
              alt={`${user.firstName} ${user.lastName}`}
              size="xxlarge"
              className="border-4 border-white dark:border-gray-800 shadow-xl"
            />

            {/* {isCurrentUser && (
              <>
                {isHovering && (
                  <label
                    htmlFor="profile-image-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer transition-opacity"
                    title="Changer la photo"
                  >
                    <Camera size={28} className="text-white drop-shadow" />
                  </label>
                )}
                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )} */}
          </div>
        </div>

        {/* Informations principales */}
        <div className="flex-1">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {user.role} • {user.department}
            </p>
          </div>

          {/* Stats follow - avec couleur #168F6F */}
          <div className="flex flex-wrap gap-2 mt-4 mb-4">
            <span className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full">
              {stats.totalPublications} publication{stats.totalPublications !== 1 ? 's' : ''}
            </span>

            <button
              onClick={onFollowersClick}
              className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 dark:hover:bg-[#168F6F]/30 transition-colors"
            >
              <span className="font-bold">{followersCount}</span> {followersCount !== 1 ? t('profile_header.followers_plural') : t('profile_header.followers_singular')}
            </button>
            <button
              onClick={onFollowingClick}
              className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 dark:hover:bg-[#168F6F]/30 transition-colors"
            >
              <span className="font-bold">{followingCount}</span> {followingCount !== 1 ? t('profile_header.following_plural') : t('profile_header.following_singular')}
            </button>
            <button
              onClick={onFriendsClick}
              className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 dark:hover:bg-[#168F6F]/30 transition-colors"
            >
              <span className="font-bold">{friendsCount}</span> {friendsCount !== 1 ? t('profile_header.friends_plural') : t('profile_header.friends_singular')}
            </button>
          </div>

          {/* Stats rapides - icônes avec couleur #168F6F */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Heart size={16} className="text-[#168F6F] dark:text-[#00B383]" />
              <span>{stats.totalLikes} {t('profile_header.likes')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MessageCircle size={16} className="text-[#168F6F] dark:text-[#00B383]" />
              <span>{stats.totalComments} {t('profile_header.comments')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Eye size={16} className="text-[#168F6F] dark:text-[#00B383]" />
              <span>{stats.totalViews.toLocaleString()} {t('profile_header.views')}</span>
            </div>
          </div>
        </div>

        {/* Bouton Modifier le profil */}
        {isCurrentUser && (
          <div className="flex-shrink-0">
            <button
              onClick={onEditClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#168F6F] text-white rounded-lg hover:bg-[#00B383] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Edit size={18} />
              <span className="font-medium">{t('profile_header.edit_profile')}</span>
            </button>
          </div>
        )}
      </div>

      {isCurrentUser && previewImage && (
        <div className="mt-3 p-2 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm rounded-lg flex items-center gap-2">
          <div className="w-3 h-3 bg-[#168F6F] rounded-full animate-pulse" />
          <span>{t('profile_header.image_selected')}</span>
        </div>
      )}
    </div>
  );
}