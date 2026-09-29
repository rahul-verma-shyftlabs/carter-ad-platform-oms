import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import KanbanBoard from '@/modules/crm/components/kanban-board.component';

const KanbanBoardPage: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Ticket Kanban Board" />
      <KanbanBoard />
    </>
  );
};

KanbanBoardPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Ticket Kanban Board' }}>{page}</InternalLayout>;
};

export default KanbanBoardPage;
