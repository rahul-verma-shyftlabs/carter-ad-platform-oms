import React from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import MondayBoardView from '@/modules/crm/components/monday/monday-board-view.component';

const MondayBoardPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { boardId } = router.query;

  if (!boardId || typeof boardId !== 'string') {
    return null;
  }

  return (
    <>
      {/* <PageHeader title="Monday.com Board" /> */}
      <MondayBoardView boardId={boardId} />
    </>
  );
};

MondayBoardPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Monday.com Board' }}>{page}</InternalLayout>;
};

export default MondayBoardPage;
