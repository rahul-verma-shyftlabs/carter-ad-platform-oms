import React from 'react';
import { ColumnDef, createColumnHelper, Typography, Chip, carterColors } from 'shyftlabs-dsl';
import MoreMenu from '@/components/menu/menu.component';

// Salesforce record type (generic)
type SalesforceRecord = {
  Id?: string;
  Name?: string;
  [key: string]: any;
};

// Lead specific type
type LeadRecord = SalesforceRecord & {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Status?: string;
  LeadSource?: string;
  OwnerId?: string;
  Owner?: { Name?: string };
  CreatedDate?: string;
  LastModifiedDate?: string;
};

// Contact specific type
type ContactRecord = SalesforceRecord & {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  AccountId?: string;
  Account?: { Name?: string };
  Title?: string;
  Department?: string;
  OwnerId?: string;
  Owner?: { Name?: string };
  CreatedDate?: string;
  LastModifiedDate?: string;
};

// Opportunity specific type
type OpportunityRecord = SalesforceRecord & {
  Amount?: number;
  StageName?: string;
  CloseDate?: string;
  AccountId?: string;
  Account?: { Name?: string };
  Probability?: number;
  Type?: string;
  OwnerId?: string;
  Owner?: { Name?: string };
  CreatedDate?: string;
  LastModifiedDate?: string;
};

// Account specific type
type AccountRecord = SalesforceRecord & {
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingCountry?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    return value.Name || JSON.stringify(value);
  }
  return String(value);
};

const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (isNaN(num)) return formatValue(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

const formatDate = (value: any): string => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return formatValue(value);
  }
};

export const getLeadColumns = (
  onCreateTicket?: (lead: LeadRecord) => void,
  onNameClick?: (lead: LeadRecord) => void
): ColumnDef<LeadRecord, any>[] => {
  const columnHelper = createColumnHelper<LeadRecord>();
  const columns: ColumnDef<LeadRecord, any>[] = [];

  columns.push(
    columnHelper.accessor('Company', {
      header: 'Company',
      cell: ({ row, getValue }) => {
        const company = getValue() || '-';
        if (company === '-') {
          return <Typography variant="body-regular">{company}</Typography>;
        }
        return (
          <span
            style={{
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (row.original.Id && onNameClick) {
                onNameClick(row.original);
              }
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <Typography color={carterColors['links-blue']}>
              {company}
            </Typography>
          </span>
        );
      },
    }),
    columnHelper.accessor(row => {
      const firstName = row.FirstName || '';
      const lastName = row.LastName || '';
      return `${firstName} ${lastName}`.trim() || row.Name || '-';
    }, {
      id: 'Name',
      header: 'Name',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Email', {
      header: 'Email',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Phone', {
      header: 'Phone',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor((row) => row.Owner?.Name ?? '-', {
      id: 'Owner',
      header: 'Owner',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Status', {
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() || '-';
        if (status === '-') {
          return <Chip label={status} />;
        }
        
        const statusLower = String(status).toLowerCase();
        let chipColor = carterColors['grey-600'];
        
        // Color mapping for lead statuses
        if (statusLower.includes('closed') && statusLower.includes('not') && statusLower.includes('converted')) {
          // Closed - Not Converted: Red
          chipColor = carterColors['red-700'];
        } else if (statusLower.includes('open') || statusLower.includes('not contacted')) {
          // Open - Not Contacted: Blue
          chipColor = carterColors['brand-600'];
        } else if (statusLower.includes('working') || statusLower.includes('contacted')) {
          // Working - Contacted: Dark Blue
          chipColor = carterColors['blue-700'];
        } else if (statusLower.includes('converted') && !statusLower.includes('not')) {
          // Converted: Green
          chipColor = carterColors['green-700'];
        } else if (statusLower.includes('closed')) {
          // Other Closed: Grey
          chipColor = carterColors['grey-600'];
        }
        
        return (
          <Chip 
            label={status}
            style={{
              backgroundColor: chipColor,
              color: 'white',
            }}
          />
        );
      },
    }),
    columnHelper.accessor('LeadSource', {
      header: 'Lead Source',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('CreatedDate', {
      header: 'Created Date',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor('LastModifiedDate', {
      header: 'Last Modified',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const options = [
          {
            label: 'Create Ticket',
            onClick: () => onCreateTicket?.(row.original),
          },
        ];
        return <MoreMenu options={options} />;
      },
    })
  );

  return columns;
};

export const getContactColumns = (
  onNameClick?: (contact: ContactRecord) => void,
  onCreateTicket?: (contact: ContactRecord) => void
): ColumnDef<ContactRecord, any>[] => {
  const columnHelper = createColumnHelper<ContactRecord>();
  const columns: ColumnDef<ContactRecord, any>[] = [];

  columns.push(
    columnHelper.accessor(row => {
      if (row.FirstName && row.LastName) {
        return `${row.FirstName} ${row.LastName}`.trim();
      }
      return row.Name || '-';
    }, {
      id: 'Name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.original.FirstName && row.original.LastName
          ? `${row.original.FirstName} ${row.original.LastName}`.trim()
          : row.original.Name || '-';
        return (
          <span
            style={{
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (row.original.Id && onNameClick) {
                onNameClick(row.original);
              }
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <Typography variant="body-regular" color={carterColors['links-blue']}>
              {name}
            </Typography>
          </span>
        );
      },
    }),
    columnHelper.accessor('Email', {
      header: 'Email',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Phone', {
      header: 'Phone',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor((row) => row.Owner?.Name ?? '-', {
      id: 'Owner',
      header: 'Owner',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Title', {
      header: 'Title',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Department', {
      header: 'Department',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('CreatedDate', {
      header: 'Created Date',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor('LastModifiedDate', {
      header: 'Last Modified',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const options = [
          {
            label: 'Create Ticket',
            onClick: () => onCreateTicket?.(row.original),
          },
        ];
        return <MoreMenu options={options} />;
      },
    })
  );

  return columns;
};

export const getOpportunityColumns = (
  onCreateTicket?: (opportunity: OpportunityRecord) => void,
  onNameClick?: (opportunity: OpportunityRecord) => void
): ColumnDef<OpportunityRecord, any>[] => {
  const columnHelper = createColumnHelper<OpportunityRecord>();
  const columns: ColumnDef<OpportunityRecord, any>[] = [];

  columns.push(
    columnHelper.accessor('Name', {
      header: 'Name',
      cell: ({ row, getValue }) => (
        <span
          style={{
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block'
          }}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (row.original.Id && onNameClick) {
              onNameClick(row.original);
            }
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          <Typography variant="body-regular" color={carterColors['links-blue']}>
            {getValue() || '-'}
          </Typography>
        </span>
      ),
    }),
    columnHelper.accessor('Amount', {
      header: 'Amount',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatCurrency(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor((row) => row.Owner?.Name ?? '-', {
      id: 'Owner',
      header: 'Owner',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('StageName', {
      header: 'Stage',
      cell: ({ getValue }) => {
        const stage = getValue() || '-';
        let chipColor = carterColors['grey-600'];
        
        // Color code based on stage
        if (typeof stage === 'string') {
          const stageLower = stage.toLowerCase();
          if (stageLower.includes('closed won') || stageLower.includes('won')) {
            chipColor = carterColors['green-700'];
          } else if (stageLower.includes('closed lost') || stageLower.includes('lost')) {
            chipColor = carterColors['red-700'];
          } else if (stageLower.includes('negotiation') || stageLower.includes('proposal')) {
            chipColor = carterColors['blue-700'];
          } else if (stageLower.includes('qualification') || stageLower.includes('prospecting')) {
            chipColor = carterColors['brand-600'];
          }
        }
        
        return (
          <Chip 
            label={stage}
            style={{
              backgroundColor: chipColor,
              color: 'white',
            }}
          />
        );
      },
    }),
    columnHelper.accessor('CloseDate', {
      header: 'Close Date',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor('Probability', {
      header: 'Probability (%)',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">
          {getValue() !== null && getValue() !== undefined ? `${getValue()}%` : '-'}
        </Typography>
      ),
    }),
    columnHelper.accessor('Type', {
      header: 'Type',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('CreatedDate', {
      header: 'Created Date',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor('LastModifiedDate', {
      header: 'Last Modified',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const options = [
          {
            label: 'Create Ticket',
            onClick: () => onCreateTicket?.(row.original),
          },
        ];
        return <MoreMenu options={options} />;
      },
    })
  );

  return columns;
};

export const getAccountColumns = (): ColumnDef<AccountRecord, any>[] => {
  const columnHelper = createColumnHelper<AccountRecord>();
  const columns: ColumnDef<AccountRecord, any>[] = [];

  columns.push(
    columnHelper.accessor('Name', {
      header: 'Name',
      cell: ({ getValue }) => (
        <Typography variant="body-regular" color={carterColors['text-900']}>
          {getValue() || '-'}
        </Typography>
      ),
    }),
    columnHelper.accessor('Type', {
      header: 'Type',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Industry', {
      header: 'Industry',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Phone', {
      header: 'Phone',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('Website', {
      header: 'Website',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('BillingCity', {
      header: 'City',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('BillingState', {
      header: 'State',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('BillingCountry', {
      header: 'Country',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{getValue() || '-'}</Typography>
      ),
    }),
    columnHelper.accessor('CreatedDate', {
      header: 'Created Date',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    }),
    columnHelper.accessor('LastModifiedDate', {
      header: 'Last Modified',
      cell: ({ getValue }) => (
        <Typography variant="body-regular">{formatDate(getValue())}</Typography>
      ),
    })
  );

  return columns;
};
