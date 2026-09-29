import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import MondayConnector from '@/modules/crm/components/monday-connector.component';

const MondayConnectPage: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Connect Monday.com" />
      <MondayConnector />
    </>
  );
};

MondayConnectPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Connect Monday.com' }}>{page}</InternalLayout>;
};

export default MondayConnectPage;
