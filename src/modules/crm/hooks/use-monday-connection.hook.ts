import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useSWR from 'swr';
import MondayService, { MondayConnectionStatus } from '@/services/crm/monday/monday.service';
import { IRootState } from '@/redux/reducers';

export const useMondayConnection = () => {
  const mondayService = useMemo(() => new MondayService(), []);
  
  // Get user ID from Redux state
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const userId = reduxUser?.id || reduxUser?.accountId || null;

  const { data, error, mutate, isLoading } = useSWR<MondayConnectionStatus>(
    userId ? ['monday-connection-status', userId] : null,
    async () => {
      try {
        return await mondayService.getConnectionStatus(userId || undefined);
      } catch (_error) {
        return { connected: false };
      }
    },
    {
      revalidateOnFocus: false,
    }
  );

  const isConnected = data?.connected || false;

  return {
    connectionStatus: data,
    isConnected,
    isLoading,
    error,
    mutate,
  };
};
