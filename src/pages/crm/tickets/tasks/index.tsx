import React from 'react';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import TaskManagement from '@/modules/crm/components/task-management.component';

const TaskManagementPage: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader title="Task Management" />
      <TaskManagement />
    </>
  );
};

TaskManagementPage.getLayout = page => {
  return <InternalLayout>{page}</InternalLayout>;
};

export default TaskManagementPage;
