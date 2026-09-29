import { useMemo } from 'react';
import useSWR from 'swr';
import MondayService, { MondayItem } from '@/services/crm/monday/monday.service';

export const useMondayItem = (itemId: string | null) => {
  const mondayService = useMemo(() => new MondayService(), []);

  const { data, error, mutate, isLoading } = useSWR<{ item: MondayItem } | null>(
    itemId ? `monday-item-${itemId}` : null,
    async () => {
      if (!itemId) return null;
      const item = await mondayService.getItem(itemId);
      return item ? { item } : null;
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    item: data?.item,
    isLoading,
    error,
    mutate,
  };
};
