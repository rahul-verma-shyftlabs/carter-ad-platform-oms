import { useState } from 'react';
import { Maybe } from 'types';

const useDataTableVisibilityHelper = () => {
  const [columnVisibility, setColumnVisibility] = useState({});

  const handleColumnVisibilityChange = (updater: any) => {
    if (typeof updater === 'function') {
      setColumnVisibility(old => updater(old));
    } else {
      setColumnVisibility(updater);
    }
  };

  return {
    handleColumnVisibilityChange,
    columnVisibility,
  };
};

type TableSortColumn = { id: string; desc: boolean };

const encodeApiSort = (column: TableSortColumn) => {
  const prefix = column.desc ? '-' : '+';
  return `${prefix}${column.id}`;
};

export const parseTableSort = (
  sort: Maybe<string> | undefined,
  defaultSort: TableSortColumn = { id: 'createdAt', desc: true },
): TableSortColumn[] => {
  if (!sort) {
    return [defaultSort];
  }
  const desc = sort.startsWith('-');
  const id = sort.replace(/^[+-]/, '');
  return [{ id, desc }];
};

export const toApiSort = (
  sort: TableSortColumn[] | undefined,
  defaultSort: TableSortColumn = { id: 'createdAt', desc: true },
): string => {
  const first = sort?.[0];
  if (!first) return encodeApiSort(defaultSort);
  return encodeApiSort(first);
};

export function getSortBy(
  columnVisibilityOrColumnsOrSortType: Record<string, boolean> | any[] | string,
  sortTypeOrSortBy: string,
  sortBy?: string,
  defaultValue?: string,
) {
  if (typeof columnVisibilityOrColumnsOrSortType === 'string') {
    return `${columnVisibilityOrColumnsOrSortType}${sortTypeOrSortBy}`;
  }
  const availableColumns = Array.isArray(columnVisibilityOrColumnsOrSortType)
    ? columnVisibilityOrColumnsOrSortType.reduce((acc: Record<string, boolean>, column: any) => {
        const key = (column?.id ?? column?.accessorKey) as string | undefined;
        if (key) acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>)
    : columnVisibilityOrColumnsOrSortType;
  const sortByValue = !availableColumns[sortBy as string] ? defaultValue : sortBy;
  return `${sortTypeOrSortBy}${sortByValue}`;
}

export default useDataTableVisibilityHelper;
