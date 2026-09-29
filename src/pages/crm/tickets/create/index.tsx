import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import CreateTicket from '@/modules/crm/components/create-ticket.component';

const CreateTicketPage: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Create Ticket" />
      <CreateTicket />
    </>
  );
};

CreateTicketPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Create Ticket' }}>{page}</InternalLayout>;
};

export default CreateTicketPage;
