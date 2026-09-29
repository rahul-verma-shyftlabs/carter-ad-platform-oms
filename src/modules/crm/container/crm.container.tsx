import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import CRMAppLibrary from '../components/crm-app-library.component';

const CRM: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Core OMS" />
      <CRMAppLibrary />
    </>
  );
};

CRM.getLayout = page => {
  return <InternalLayout head={{ title: 'Core OMS Integrations' }}>{page}</InternalLayout>;
};

export default CRM;
