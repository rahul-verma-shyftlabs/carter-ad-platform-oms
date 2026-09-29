import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ROUTES from '@/common/routes';

const HomePage = () => {
  const router = useRouter();
  useEffect(() => {
    void router.replace(ROUTES.CRM.BASE);
  }, [router]);
  return null;
};

export default HomePage;
