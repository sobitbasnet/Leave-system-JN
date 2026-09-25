import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'APPROVER' || user.role === 'ADMIN') {
    redirect('/approver/dashboard');
  }

  redirect('/dashboard');
}
