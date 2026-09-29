import { useMemo } from 'react';
import useSWR from 'swr';
import MondayService, { MondayBoard } from '@/services/crm/monday/monday.service';

export const useMondayBoard = (boardId: string | null) => {
  const mondayService = useMemo(() => new MondayService(), []);

  const { data, error, mutate, isLoading } = useSWR<{ board: MondayBoard } | null>(
    boardId ? `monday-board-${boardId}` : null,
    async () => {
      if (!boardId) return null;
      // Use silent mode for background revalidation to prevent global loader
      const board = await mondayService.getBoard(boardId, true);
      return board ? { board } : null;
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    board: data?.board,
    isLoading,
    error,
    mutate,
  };
};
