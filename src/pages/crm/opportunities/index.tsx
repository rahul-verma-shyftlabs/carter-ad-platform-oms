import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import ROUTES from '@/common/routes';

const OpportunitiesListPage: NextPageWithLayout = () => {
  const router = useRouter();
  
  // Redirect to Carter OMS tab view with opportunities tab active
  useEffect(() => {
    router.replace(`${ROUTES.CRM.BASE}?tab=opportunities`);
  }, [router]);

  return null; // Will redirect, so nothing to render
};

OpportunitiesListPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Opportunities' }}>{page}</InternalLayout>;
};

export default OpportunitiesListPage;
