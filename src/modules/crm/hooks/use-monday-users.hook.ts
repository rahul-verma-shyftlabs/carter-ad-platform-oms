import { useMemo } from 'react';
import useSWR from 'swr';
import MondayService from '@/services/crm/monday/monday.service';

export interface MondayUser {
  id: string;
  name: string;
  email?: string;
  photo_small?: string;
}

export const useMondayUsers = () => {
  const mondayService = useMemo(() => new MondayService(), []);

  const { data, error, mutate, isLoading } = useSWR<{ users: MondayUser[] }>(
    'monday-users',
    async () => {
      try {
        const users = await mondayService.getUsers();
        return { users: Array.isArray(users) ? users : [] };
      } catch {
        return { users: [] };
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0, // Disable deduplication to always fetch fresh data
    }
  );

  const users = Array.isArray(data?.users) ? (data?.users || []) : [];

  return {
    users,
    isLoading,
    error,
    mutate,
  };
};
