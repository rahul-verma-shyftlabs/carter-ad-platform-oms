import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import SalesforceConnector from '@/modules/crm/components/salesforce-connector.component';

const SalesforceConnectPage: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Connect Salesforce" />
      <SalesforceConnector />
    </>
  );
};

SalesforceConnectPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Connect Salesforce' }}>{page}</InternalLayout>;
};

export default SalesforceConnectPage;
