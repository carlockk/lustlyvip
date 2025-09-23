'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaImage } from 'react-icons/fa';
import { useLanguage } from '@/lib/i18n';

export default function SignupPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [role, setRole] = useState('consumer');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fileType === 'profilePicture') { setProfilePictureFile(file); setProfilePicturePreview(reader.result); }
        if (fileType === 'coverPhoto') { setCoverPhotoFile(file); setCoverPhotoPreview(reader.result); }
      };
      reader.readAsDataURL(file);
    } else {
      if (fileType === 'profilePicture') { setProfilePictureFile(null); setProfilePicturePreview(null); }
      if (fileType === 'coverPhoto') { setCoverPhotoFile(null); setCoverPhotoPreview(null); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(t('registering'));
    setIsError(false);
    setIsLoading(true);
    const data = new FormData();
    data.append('username', formData.username);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('role', role);
    if (profilePictureFile) data.append('profilePicture', profilePictureFile);
    if (coverPhotoFile) data.append('coverPhoto', coverPhotoFile);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', body: data });
      const responseData = await res.json();
      if (res.ok) {
        setMessage(t('signupSuccess'));
        setIsError(false);
        setFormData({ username: '', email: '', password: '' });
        setProfilePictureFile(null); setCoverPhotoFile(null);
        setProfilePicturePreview(null); setCoverPhotoPreview(null);
      } else {
        setMessage(responseData.message || t('signupError'));
        setIsError(true);
      }
    } catch (error) {
      setMessage(t('connectionError'));
      setIsError(true);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100">
      <div className="flex flex-col bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">Lustly</h1>
          <p className="text-lg text-gray-400">{t('signupTitle')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('accountType') || 'Tipo de cuenta'}</label>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="consumer" checked={role==='consumer'} onChange={()=>setRole('consumer')} />
                {t('consumer') || 'Consumidor'}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="creator" checked={role==='creator'} onChange={()=>setRole('creator')} />
                {t('creator') || 'Creador'}
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">{t('username')}</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="@tu_nombre" required disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">{t('email')}</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="tu@correo.com" required disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">{t('password')}</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="********" required disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-300 mb-2">{t('profilePhoto')}</label>
            <input type="file" id="profilePicture" name="profilePicture" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePicture')} className="hidden" disabled={isLoading} />
            <label htmlFor="profilePicture" className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
              <FaImage className="mr-2" /> {t('uploadProfilePhoto')}
            </label>
            {profilePicturePreview && (
              <div className="mt-2 text-center">
                <img src={profilePicturePreview} alt="preview" className="mt-2 mx-auto h-24 w-24 rounded-full object-cover border-2 border-pink-500" />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="coverPhoto" className="block text-sm font-medium text-gray-300 mb-2">{t('coverPhoto')}</label>
            <input type="file" id="coverPhoto" name="coverPhoto" accept="image/*" onChange={(e) => handleFileChange(e, 'coverPhoto')} className="hidden" disabled={isLoading} />
            <label htmlFor="coverPhoto" className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
              <FaImage className="mr-2" /> {t('uploadCoverPhoto')}
            </label>
            {coverPhotoPreview && (
              <div className="mt-2 text-center">
                <img src={coverPhotoPreview} alt="cover preview" className="mt-2 mx-auto w-full h-32 object-cover rounded-md border-2 border-pink-500" />
              </div>
            )}
          </div>
          <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500" disabled={isLoading}>
              {isLoading ? t('registering') : t('signupCta')}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 text-center text-sm font-medium ${isError ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm">
            {t('haveAccountQuestion')} <Link href="/auth/login" className="font-medium text-pink-500 hover:text-pink-400">{t('loginHere')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
