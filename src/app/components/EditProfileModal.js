'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function EditProfileModal({ isOpen, onClose, user, onSave }) {
    const { data: session } = useSession();
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        bio: user?.bio || '',
        profilePicture: null,
        coverPhoto: null,
    });
    const [previews, setPreviews] = useState({ profilePicture: null, coverPhoto: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Mantener el formulario sincronizado cuando cambie el usuario o al abrir
    useEffect(() => {
        if (user) {
            setFormData((prev) => ({
                ...prev,
                username: user.username || '',
                email: user.email || '',
                bio: user.bio || '',
            }));
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            const file = files[0];
            if (!file) return;
            if (!ALLOWED_TYPES.has(file.type)) {
                setError('Tipo de imagen no permitido. Usa JPEG, PNG o WEBP.');
                return;
            }
            if (file.size > MAX_BYTES) {
                setError('La imagen es demasiado grande (máx. 5MB).');
                return;
            }
            setError(null);
            setFormData({ ...formData, [name]: file });
            const url = URL.createObjectURL(file);
            setPreviews((p) => ({ ...p, [name]: url }));
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const form = new FormData();
        form.append('username', formData.username);
        form.append('email', formData.email);
        form.append('bio', formData.bio);
        if (formData.profilePicture) {
            form.append('profilePicture', formData.profilePicture);
        }
        if (formData.coverPhoto) {
            form.append('coverPhoto', formData.coverPhoto);
        }

        try {
            const res = await fetch(`/api/users/${session.user.id}`, {
                method: 'PATCH',
                body: form,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al actualizar el perfil.');
            }

            onSave();
            onClose();
            // Limpiar previews al cerrar
            setPreviews({ profilePicture: null, coverPhoto: null });
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md mx-auto shadow-lg relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition-colors"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-6 text-gray-100">Editar Perfil</h2>

                {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="username">
                            Nombre de usuario
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-3 py-2 leading-tight text-gray-700 bg-gray-200 border rounded shadow focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="bio">
                            Biografía
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="w-full px-3 py-2 leading-tight text-gray-700 bg-gray-200 border rounded shadow focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="profilePicture">
                            Foto de Perfil
                        </label>
                        <input
                            type="file"
                            id="profilePicture"
                            name="profilePicture"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleChange}
                            className="w-full text-gray-400"
                        />
                        {(previews.profilePicture || user?.profilePicture) && (
                            <div className="mt-2">
                                <img
                                    src={previews.profilePicture || user.profilePicture}
                                    alt="Vista previa perfil"
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="coverPhoto">
                            Foto de Portada
                        </label>
                        <input
                            type="file"
                            id="coverPhoto"
                            name="coverPhoto"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleChange}
                            className="w-full text-gray-400"
                        />
                        {(previews.coverPhoto || user?.coverPhoto) && (
                            <div className="mt-2">
                                <img
                                    src={previews.coverPhoto || user.coverPhoto}
                                    alt="Vista previa portada"
                                    className="w-full h-24 object-cover rounded"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
