import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import ROUTES from '@/common/routes';

const ContactsListPage: NextPageWithLayout = () => {
  const router = useRouter();
  
  // Redirect to Carter OMS tab view with contacts tab active
  useEffect(() => {
    router.replace(`${ROUTES.CRM.BASE}?tab=contacts`);
  }, [router]);

  return null; // Will redirect, so nothing to render
};

ContactsListPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Contacts' }}>{page}</InternalLayout>;
};

export default ContactsListPage;
