import React from 'react';
import { Typography, carterColors, DataTable } from 'shyftlabs-dsl';
import { Database } from 'lucide-react';
import { getAccountColumns } from '../../../helpers/salesforce-columns.helper';
import { CardComponentProps } from '../../salesforce-data-view/types';
import styles from '../../../styles/crm.module.scss';

const CarterOMSAccountCards: React.FC<CardComponentProps> = ({
  data,
  searchTerm,
  isLoading,
  columnVisibility,
  handleColumnVisibilityChange,
  enableColumnHiding,
}) => {
  const accounts = data as any[];

  if (!accounts || accounts.length === 0) {
    return (
      <div className={styles.empty_state}>
        <Database size={32} color={carterColors['text-400']} />
        <Typography variant="body-regular" color={carterColors['text-600']}>
          {searchTerm
            ? `No accounts found matching "${searchTerm}"`
            : `No accounts found`}
        </Typography>
      </div>
    );
  }

  // Accounts always show table view (same as Salesforce)
  const columns = getAccountColumns();
  return (
    <div className={styles.opportunities_wrapper}>
      <div className={styles.data_table_wrapper}>
        <DataTable
          columns={columns as any}
          data={accounts}
          loading={isLoading}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          enableColumnHiding={enableColumnHiding}
          fallback={{
            title: `No accounts found`,
            description: searchTerm
              ? `Try adjusting your search term`
              : `No accounts data available`,
          }}
          pagination={{
            pageNo: 1,
            pageSize: 50,
            totalCount: accounts.length,
          }}
        />
      </div>
    </div>
  );
};

export default CarterOMSAccountCards;
