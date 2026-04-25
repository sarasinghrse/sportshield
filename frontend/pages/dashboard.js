import { useEffect } from 'react';
import { useRouter } from 'next/router';

// /dashboard → redirect to the actual dashboard at /
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return null;
}
