import React from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  SearchInput,
  ColumnToggle,
  PriorityFilters,
} from 'shyftlabs-dsl';
import { Plus as PlusIcon, LayoutGrid, Table } from 'lucide-react';
import ROUTES from '@/common/routes';
import ClearAllFilter from '@/components/clear-all-filter/clear-all-filter.component';
import { HeaderControlsProps } from '../types';
import styles from '../../../styles/crm.module.scss';

const SalesforceHeaderControls: React.FC<HeaderControlsProps> = ({
  activeTab,
  searchTerm,
  viewMode,
  selectedLeadStatus,
  selectedOpportunityStatus,
  selectedOwner,
  uniqueStatuses,
  uniqueOpportunityStages,
  uniqueOwners,
  columnVisibility,
  handleColumnVisibilityChange,
  enableColumnHiding,
  onSearchChange,
  onViewModeChange,
  onLeadStatusChange,
  onOpportunityStatusChange,
  onOwnerChange,
  getLeadColumns,
  getContactColumns,
  getOpportunityColumns,
  getAccountColumns,
}) => {
  const router = useRouter();

  if (activeTab === 'dashboard') return null;

  const searchPlaceholders: Record<string, string> = {
    leads: 'Search for Leads',
    contacts: 'Search for Contacts',
    opportunities: 'Search for Opportunities',
    accounts: 'Search for Accounts',
  };

  const handleCreateLead = () => {
    router.push(ROUTES.CRM.LEADS.CREATE);
  };

  const handleCreateContact = () => {
    router.push(ROUTES.CRM.CONTACTS.CREATE);
  };

  const handleCreateOpportunity = () => {
    router.push(ROUTES.CRM.OPPORTUNITIES.CREATE);
  };

  // Status options for PriorityFilters (Leads)
  const statusOptions = uniqueStatuses.map((status) => ({
    label: status,
    value: status,
  }));

  // Stage options for PriorityFilters (Opportunities)
  const stageOptions = uniqueOpportunityStages.map((stage) => ({
    label: stage,
    value: stage,
  }));

  // Owner options for PriorityFilters (Leads, Contacts, Opportunities)
  const ownerOptions = uniqueOwners.map((name) => ({
    label: name,
    value: name,
  }));

  const hasFilters = selectedLeadStatus !== 'all'
    || selectedOpportunityStatus !== 'all'
    || selectedOwner !== 'all';

  const clearAllFilters = () => {
    onLeadStatusChange('all');
    onOpportunityStatusChange('all');
    onOwnerChange('all');
  };

  // Get columns for ColumnToggle
  const getColumnsForTab = () => {
    switch (activeTab) {
      case 'leads':
        return getLeadColumns() as any;
      case 'contacts':
        return getContactColumns() as any;
      case 'opportunities':
        return getOpportunityColumns() as any;
      case 'accounts':
        return getAccountColumns() as any;
      default:
        return [];
    }
  };

  return (
    <div className={styles.data_table_header} style={{ 
      padding: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        flexWrap: 'wrap',
        flex: 1,
      }}>
        <div style={{ flex: '0 0 386px', maxWidth: '386px' }}>
          <SearchInput
            placeholder={searchPlaceholders[activeTab] || `Search ${activeTab}...`}
            initialValue={searchTerm}
            onSearch={onSearchChange}
          />
        </div>
        {activeTab === 'leads' && (
          <PriorityFilters
            mode="single"
            placeholder="Status"
            fallback="All"
            initialValue={selectedLeadStatus !== 'all' 
              ? { label: selectedLeadStatus, value: selectedLeadStatus }
              : undefined
            }
            options={statusOptions}
            onChange={(value: any) => onLeadStatusChange(value?.value || 'all')}
          />
        )}
        {activeTab === 'opportunities' && (
          <PriorityFilters
            mode="single"
            placeholder="Status"
            fallback="All"
            initialValue={selectedOpportunityStatus !== 'all' 
              ? { label: selectedOpportunityStatus, value: selectedOpportunityStatus }
              : undefined
            }
            options={stageOptions}
            onChange={(value: any) => onOpportunityStatusChange(value?.value || 'all')}
          />
        )}
        {(activeTab === 'leads' || activeTab === 'contacts' || activeTab === 'opportunities') && ownerOptions.length > 0 && (
          <PriorityFilters
            mode="single"
            placeholder="Owner"
            fallback="All"
            initialValue={selectedOwner !== 'all'
              ? { label: selectedOwner, value: selectedOwner }
              : undefined
            }
            options={ownerOptions}
            onChange={(value: any) => onOwnerChange(value?.value || 'all')}
          />
        )}
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'center',
      }}>
        {viewMode === 'table' && (
          <ColumnToggle
            enableColumnHiding={enableColumnHiding}
            columns={getColumnsForTab()}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
          />
        )}
        {hasFilters && (
          <ClearAllFilter 
            isVisible={hasFilters} 
            onClick={clearAllFilters} 
          />
        )}
        {activeTab === 'leads' && (
          <Button
            variant="primary"
            size="small"
            label="Create Lead"
            icon={<PlusIcon size={16} />}
            onClick={handleCreateLead}
          />
        )}
        {activeTab === 'contacts' && (
          <Button
            variant="primary"
            size="small"
            label="Create Contact"
            icon={<PlusIcon size={16} />}
            onClick={handleCreateContact}
          />
        )}
        {activeTab === 'opportunities' && (
          <Button
            variant="primary"
            size="small"
            label="Create Opportunity"
            icon={<PlusIcon size={16} />}
            onClick={handleCreateOpportunity}
          />
        )}
        {activeTab !== 'accounts' && (
          <div className={styles.view_toggle}>
            <Button
              variant={viewMode === 'card' ? 'primary' : 'secondary'}
              size="small"
              icon={<LayoutGrid size={16} />}
              onClick={() => onViewModeChange('card')}
            />
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="small"
              icon={<Table size={16} />}
              onClick={() => onViewModeChange('table')}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesforceHeaderControls;
