import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import HomeAuthenticated from './components/HomeAuthenticated';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  return <HomeAuthenticated />;
}

