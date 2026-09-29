import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import ROUTES from '@/common/routes';

const TicketsListPage: NextPageWithLayout = () => {
  const router = useRouter();

  // Redirect to Carter OMS (dashboard)
  useEffect(() => {
    router.replace(ROUTES.CRM.BASE);
  }, [router]);

  return null; // Will redirect, so nothing to render
};

TicketsListPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Tickets' }}>{page}</InternalLayout>;
};

export default TicketsListPage;
