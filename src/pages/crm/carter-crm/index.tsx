import React, { useState } from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import CarterOMSDataView from '@/modules/crm/components/carter-oms-data-view.component';

interface HeaderActionsComponentProps {
  headerActions: React.ReactNode;
}

const HeaderActionsComponent: React.FC<HeaderActionsComponentProps> = ({ headerActions }) => (
  <>{headerActions}</>
);

const CarterOMSPage: NextPageWithLayout = () => {
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  return (
    <>
      <PageHeader 
        title="Carter CRM" 
        showBackButton={false}
        ActionComponent={headerActions ? () => <HeaderActionsComponent headerActions={headerActions} /> : undefined} 
      />
      <CarterOMSDataView onHeaderActionsReady={setHeaderActions} />
    </>
  );
};

CarterOMSPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Carter CRM' }}>{page}</InternalLayout>;
};

export default CarterOMSPage;
