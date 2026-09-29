import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import SalesforceDataView from '@/modules/crm/components/salesforce-data-view.component';
import ROUTES from '@/common/routes';

interface HeaderActionsComponentProps {
  headerActions: React.ReactNode;
}

const HeaderActionsComponent: React.FC<HeaderActionsComponentProps> = ({ headerActions }) => (
  <>{headerActions}</>
);

const SalesforceDataPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  return (
    <>
      <PageHeader 
        title="Salesforce Data" 
        showBackButton
        onPressBackButton={() => router.push(ROUTES.CRM.BASE)}
        ActionComponent={headerActions ? () => <HeaderActionsComponent headerActions={headerActions} /> : undefined} 
      />
      <SalesforceDataView onHeaderActionsReady={setHeaderActions} />
    </>
  );
};

SalesforceDataPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Salesforce Data' }}>{page}</InternalLayout>;
};

export default SalesforceDataPage;
