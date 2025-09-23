import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Exporta esta función para poder obtener la sesión en cualquier Server Component o API Route.
export const auth = () => {
  return getServerSession(authOptions);
};