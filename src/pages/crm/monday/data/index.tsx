import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import MondayDataView from '@/modules/crm/components/monday-data-view.component';
import ROUTES from '@/common/routes';
import { showAlert } from '@/redux/actions';
import { setOmsSession } from '@/lib/oms-session';

const MondayDataPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { success, monday_token, user_id, error } = router.query;
  
  useEffect(() => {
    // Handle OAuth callback redirect from backend
    if (success === 'true' && monday_token && typeof monday_token === 'string') {
      // Store token in localStorage
      setOmsSession({
        mondayToken: monday_token,
        mondayUserId: typeof user_id === 'string' ? user_id : undefined,
      });
      
      // Clean up URL by removing query parameters
      router.replace(router.asPath.split('?')[0], undefined, { shallow: true });
      
      showAlert({
        variant: 'success' as any,
        title: 'Monday.com connected successfully',
      });
    } else if (error && typeof error === 'string') {
      // Handle error from backend redirect
      router.replace(`${ROUTES.CRM.MONDAY.CONNECT}?error=${encodeURIComponent(error)}`, undefined, { shallow: true });
      
      showAlert({
        variant: 'error' as any,
        title: `Failed to connect Monday.com: ${error}`,
      });
    }
  }, [success, monday_token, user_id, error, router]);
  
  return (
    <>
      <PageHeader 
        title="Monday.com Boards" 
        showBackButton
        onPressBackButton={() => router.push(ROUTES.CRM.BASE)}
      />
      <MondayDataView />
    </>
  );
};

MondayDataPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Monday.com' }}>{page}</InternalLayout>;
};

export default MondayDataPage;
