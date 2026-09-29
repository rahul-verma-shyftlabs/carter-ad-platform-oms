import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import ROUTES from '@/common/routes';

const LeadsListPage: NextPageWithLayout = () => {
  const router = useRouter();
  
  // Redirect to Carter OMS tab view with leads tab active
  useEffect(() => {
    router.replace(`${ROUTES.CRM.BASE}?tab=leads`);
  }, [router]);
  return null; // Will redirect, so nothing to render
};

LeadsListPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Leads' }}>{page}</InternalLayout>;
};

export default LeadsListPage;
