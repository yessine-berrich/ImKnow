'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, Globe, Upload, Building, X } from 'lucide-react';
import { getToken } from '../../../services/auth.service';
import { resolveAvatarUrl } from '@/utils/profile-image';
import { useUser } from '@/context/UserContext';
import { toast } from '@/components/modals/ToastContainer';
import { useTranslation } from '@/context/LanguageContext';

interface ProfileTabProps {
  currentProfile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    postalCode: string;
    bio?: string;
    department?: string;
    /** The stored profileImage path — e.g. /uploads/avatars/user-5-abc12.webp */
    avatar?: string | null;
  };
  userId: string;
  onSave: (data: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProfileTab({ currentProfile, userId, onSave }: ProfileTabProps) {
  const { t } = useTranslation();
  const { updateUser } = useUser();

  const [profile, setProfile] = useState(currentProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs pour les champs
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Local file selected by the user — shown as a preview before save
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Whether the user has requested to remove their current photo
  const [pendingRemovePhoto, setPendingRemovePhoto] = useState(false);

  // Sync local form state when the parent updates currentProfile
  useEffect(() => {
    setProfile(currentProfile);
    setSelectedFile(null);
    setPendingRemovePhoto(false);
    setPhoneError('');
    setEmptyFields([]);
    // Revoke any leftover preview blob
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [currentProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke preview blob URL when the component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Fonction de validation du numéro de téléphone
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Champ optionnel
    
    // Supprime tous les espaces et caractères non numériques pour la validation
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Regex pour différents formats internationaux
    // Accepte: +XX XXXXXXXXX, 0XXXXXXXXX, etc.
    const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
    
    // Validation plus stricte pour les numéros de téléphone
    // Minimum 8 chiffres, maximum 15 chiffres
    const digitsOnly = cleanPhone.replace(/[^+\d]/g, '');
    const digitCount = digitsOnly.replace(/[^0-9]/g, '').length;
    
    return phoneRegex.test(cleanPhone) && digitCount >= 8 && digitCount <= 15;
  };

  // Formater le numéro de téléphone pendant la saisie
  const formatPhoneNumber = (value: string): string => {
    // Supprime tous les caractères non numériques sauf le +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par 00, le remplacer par +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    }
    
    return cleaned;
  };

  // Fonction pour animer le clignotement rouge
  const triggerBlinkAnimation = (fieldName: string) => {
    setShakeFields(prev => [...prev, fieldName]);
    setTimeout(() => {
      setShakeFields(prev => prev.filter(f => f !== fieldName));
    }, 500);
  };

  // Fonction pour scroller vers un élément
  const scrollToElement = (element: HTMLElement | null) => {
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      // Ajouter une classe pour mettre en évidence
      element.classList.add('highlight-field');
      setTimeout(() => {
        element.classList.remove('highlight-field');
      }, 2000);
    }
  };

  // Valider les champs obligatoires
  const validateRequiredFields = (): boolean => {
    const requiredFields = ['firstName', 'lastName'];
    const empty: string[] = [];
    
    requiredFields.forEach(field => {
      const value = profile[field as keyof typeof profile];
      if (!value || value.trim() === '') {
        empty.push(field);
      }
    });
    
    setEmptyFields(empty);
    
    // Déclencher l'animation pour chaque champ vide
    empty.forEach(field => {
      triggerBlinkAnimation(field);
    });
    
    // Scroller vers le premier champ vide
    if (empty.length > 0) {
      const firstEmptyField = empty[0];
      switch(firstEmptyField) {
        case 'firstName':
          scrollToElement(firstNameRef.current);
          break;
        case 'lastName':
          scrollToElement(lastNameRef.current);
          break;
      }
    }
    
    return empty.length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Retirer le champ de la liste des champs vides si l'utilisateur commence à taper
    if (emptyFields.includes(name)) {
      setEmptyFields(prev => prev.filter(f => f !== name));
    }
    
    if (name === 'phone') {
      // Formate le numéro pendant la saisie
      const formattedValue = formatPhoneNumber(value);
      setProfile((prev) => ({ ...prev, [name]: formattedValue }));
      
      // Valide le numéro
      if (formattedValue && !validatePhoneNumber(formattedValue)) {
        setPhoneError(t('profile.invalid_phone') || 'Numéro de téléphone invalide');
      } else {
        setPhoneError('');
      }
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPendingRemovePhoto(false);
    // Revoke old preview before creating a new one
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Only mark for removal if there is an existing server-side avatar
    if (currentProfile.avatar) {
      setPendingRemovePhoto(true);
    }
  };

  /** Returns the URL to display in the preview circle. */
  const displaySrc = (): string | null => {
    if (previewUrl) return previewUrl; // local blob preview
    if (pendingRemovePhoto) return null;
    return resolveAvatarUrl(currentProfile.avatar) || null;
  };

  const handleSubmit = async () => {
    // Vérifier les champs obligatoires
    if (!validateRequiredFields()) {
      toast.error('Error updating profile.');
      return;
    }
    
    // Validation du téléphone avant soumission
    if (profile.phone && !validatePhoneNumber(profile.phone)) {
      setPhoneError(t('profile.invalid_phone') || 'Veuillez entrer un numéro de téléphone valide');
      triggerBlinkAnimation('phone');
      scrollToElement(phoneRef.current);
      toast.error('Error updating profile.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('firstName', profile.firstName);
      formData.append('lastName', profile.lastName);
      formData.append('email', profile.email);
      formData.append('phone', profile.phone || '');
      formData.append('country', profile.country || '');
      formData.append('city', profile.city || '');
      formData.append('postalCode', profile.postalCode || '');
      formData.append('bio', profile.bio || '');
      formData.append('department', profile.department || '');

      if (selectedFile) {
        formData.append('profileImage', selectedFile);
      } else if (pendingRemovePhoto) {
        formData.append('removeProfileImage', 'true');
      }

      // Use getToken() so it works for both localStorage and sessionStorage sessions
      const token = getToken();
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || `Erreur ${response.status}`);
      }

      const updatedUser = await response.json();

      // ── Propagate changes to global context ──────────────────────────────
      // Every component reading from UserContext (header, navbar, etc.) will
      // re-render automatically without any page reload.
      updateUser(updatedUser);
      onSave(updatedUser);

      // Clean up the local preview blob now that the server has the new image
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);
      setPendingRemovePhoto(false);
      setPhoneError('');
      setEmptyFields([]);

      toast.success(t('profile.success_message'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSrc = displaySrc();

  // Fonction pour obtenir les classes CSS avec animation
  const getFieldClassName = (fieldName: string, hasError: boolean = false) => {
    const baseClass = "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 transition-all duration-200";
    const isShaking = shakeFields.includes(fieldName);
    const isEmpty = emptyFields.includes(fieldName);
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500 ${isShaking ? 'animate-shake' : ''}`;
    }
    if (isEmpty) {
      return `${baseClass} border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10 ${isShaking ? 'animate-shake' : ''}`;
    }
    return `${baseClass} border-gray-300 dark:border-gray-700`;
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        @keyframes blinkRed {
          0%, 100% { border-color: #ef4444; background-color: rgba(239, 68, 68, 0.05); }
          50% { border-color: #dc2626; background-color: rgba(220, 38, 38, 0.15); }
        }
        @keyframes highlightPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-blink {
          animation: blinkRed 0.5s ease-in-out 2;
        }
        .highlight-field {
          animation: highlightPulse 0.8s ease-out;
          position: relative;
          z-index: 10;
        }
      `}</style>

      {/* ── Photo de profil ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('profile.profile_photo')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('profile.click_to_change')}
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #168F6F, #0e6b52)' }}
            >
              {currentSrc ? (
                <img
                  src={currentSrc}
                  alt={t('profile.avatar_preview')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={48} />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="absolute bottom-0 right-0 p-2 text-white rounded-full hover:opacity-90 transition-colors shadow-lg disabled:opacity-50"
              style={{ backgroundColor: '#168F6F' }}
            >
              <Upload size={20} />
            </button>

            {currentSrc && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isSubmitting}
                title={t('profile.remove_photo')}
                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile.click_to_upload')}
          </p>
        </div>
      </div>

      {/* ── Informations personnelles ────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('profile.personal_info')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('profile.update_info')}
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.first_name')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={firstNameRef}
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={getFieldClassName('firstName')}
                  placeholder={t('profile.first_name_placeholder')}
                />
              </div>
              {emptyFields.includes('firstName') && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {t('profile.required_field') || 'Ce champ est obligatoire'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.last_name')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={lastNameRef}
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={getFieldClassName('lastName')}
                  placeholder={t('profile.last_name_placeholder')}
                />
              </div>
              {emptyFields.includes('lastName') && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {t('profile.required_field') || 'Ce champ est obligatoire'}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.email')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white opacity-60 cursor-not-allowed"
                  placeholder={t('profile.email_placeholder')}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('profile.email_cannot_change')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={phoneRef}
                  type="tel"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={getFieldClassName('phone', !!phoneError)}
                  placeholder={t('profile.phone_placeholder') || '+33 6 12 34 56 78'}
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {phoneError}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.department')}
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="department"
                value={profile.department || ''}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                placeholder={t('profile.department_placeholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.country')}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="country"
                  value={profile.country || ''}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder={t('profile.country_placeholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.city')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="city"
                  value={profile.city || ''}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder={t('profile.city_placeholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.postal_code')}
              </label>
              <input
                type="text"
                name="postalCode"
                value={profile.postalCode || ''}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                placeholder={t('profile.postal_code_placeholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.bio')}
            </label>
            <textarea
              name="bio"
              value={profile.bio || ''}
              onChange={handleInputChange}
              disabled={isSubmitting}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none disabled:opacity-50"
              placeholder={t('profile.bio_placeholder')}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: '#168F6F' }}
        >
          {isSubmitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isSubmitting ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </div>
  );
}