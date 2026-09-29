import { useMemo } from 'react';
import useSWR from 'swr';
import MondayService, { MondayBoard } from '@/services/crm/monday/monday.service';

export const useMondayBoards = () => {
  const mondayService = useMemo(() => new MondayService(), []);

  const { data, error, mutate, isLoading } = useSWR<{ boards: MondayBoard[] }>(
    'monday-boards',
    async () => {
      const boards = await mondayService.getBoards();
      return { boards };
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    boards: data?.boards || [],
    isLoading,
    error,
    mutate,
  };
};
