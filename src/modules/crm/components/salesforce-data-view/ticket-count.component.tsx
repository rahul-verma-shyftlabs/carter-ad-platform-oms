import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Typography, carterColors, Tooltip } from 'shyftlabs-dsl';
import useSWR from 'swr';
import TicketService, { TicketStatus } from '@/services/crm/tickets/ticket.service';
import ROUTES from '@/common/routes';
import styles from '../../styles/crm.module.scss';

interface TicketCountProps {
  sourceId: string;
  sourceType: 'lead' | 'contact' | 'opportunity' | 'account';
  tickets?: any[]; // Optional: if provided, use these instead of fetching
}

const TicketCount: React.FC<TicketCountProps> = ({ sourceId, sourceType, tickets: providedTickets }) => {
  const router = useRouter();
  const ticketService = useMemo(() => new TicketService(), []);
  
  const handleTicketClick = useCallback(() => {
    // Navigate to tickets kanban page with source filter
    router.push(`${ROUTES.CRM.TICKETS.KANBAN}?sourceType=${sourceType}&sourceId=${sourceId}`);
  }, [router, sourceType, sourceId]);
  
  // Only fetch if tickets are not provided (explicitly check for undefined, not falsy)
  // If providedTickets is an empty array [], we should NOT fetch (it means no tickets exist)
  const shouldFetch = providedTickets === undefined && sourceId && sourceType !== 'account';
  
  const { data: ticketsData } = useSWR(
    shouldFetch
      ? [`tickets-${sourceType}-${sourceId}`, sourceType, sourceId]
      : null,
    () => {
      if (sourceType === 'account') {
        return Promise.resolve({ tickets: [], total: 0 });
      }
      return ticketService.getTicketsBySource(sourceType as 'lead' | 'contact' | 'opportunity', sourceId);
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Use provided tickets if available (even if empty array), otherwise use fetched data
  const tickets = providedTickets !== undefined ? providedTickets : (ticketsData?.tickets || []);
  
  // Count tickets by status
  const ticketCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = {
      [TicketStatus.UNASSIGNED]: 0,
      [TicketStatus.OPEN]: 0,
      [TicketStatus.CLOSED]: 0,
      [TicketStatus.APPROVED]: 0,
      [TicketStatus.REJECTED]: 0,
    };
    
    tickets.forEach((ticket: any) => {
      const status = ticket.status as TicketStatus;
      if (status && counts.hasOwnProperty(status)) {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    
    return counts;
  }, [tickets]);

  const totalOpen = ticketCounts[TicketStatus.OPEN] + ticketCounts[TicketStatus.UNASSIGNED];
  const totalClosed = ticketCounts[TicketStatus.CLOSED];
  const totalApproved = ticketCounts[TicketStatus.APPROVED];
  const totalRejected = ticketCounts[TicketStatus.REJECTED];

  const statusConfig = [
    { label: 'Total Open', count: totalOpen, color: carterColors['brand-600'], tooltip: 'Open + Unassigned' },
    { label: 'Total Closed', count: totalClosed, color: carterColors['blue-700'], tooltip: 'Closed' },
    { label: 'Total Approved', count: totalApproved, color: carterColors['green-700'], tooltip: 'Approved' },
    { label: 'Total Rejected', count: totalRejected, color: carterColors['red-700'], tooltip: 'Rejected' },
  ];

  return (
    <div 
      className={styles.opportunity_card_footer}
      onClick={(e) => e.stopPropagation()}
      style={{ 
        display: 'flex', 
        gap: '16px', 
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: `1px solid ${carterColors['grey-200']}`,
        justifyContent: 'flex-start',
      }}
    >
      <div 
        onClick={handleTicketClick}
        style={{ cursor: 'pointer' }}
      >
        <Typography 
          variant="caption-semibold" 
          color={carterColors['text-700']}
        >
          TICKETS
        </Typography>
      </div>
      {statusConfig.map((status, index) => (
        <Tooltip
          key={index}
          title={status.label}
          placement="bottom"
          arrow
        >
          <div 
            onClick={handleTicketClick}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <div 
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: status.color,
              }}
            />
            <Typography variant="caption-regular" color={carterColors['text-600']}>
              {status.count}
            </Typography>
          </div>
        </Tooltip>
      ))}
    </div>
  );
};

export default TicketCount;
