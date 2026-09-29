import React, { useMemo } from 'react';
import { Typography, carterColors, Chip } from 'shyftlabs-dsl';
import { Ticket, ArrowRight, Calendar, User } from 'lucide-react';
import useSWR from 'swr';
import TicketService, { TicketStatus } from '@/services/crm/tickets/ticket.service';
import styles from '../styles/crm.module.scss';

interface CRMRelatedTicketsProps {
  sourceType: 'lead' | 'contact' | 'opportunity';
  sourceId: string; // Salesforce record ID
  onTicketClick?: (ticketId: string) => void;
  tickets?: any[]; // Optional: if provided, use these instead of fetching
}

const CRMRelatedTickets: React.FC<CRMRelatedTicketsProps> = ({
  sourceType,
  sourceId,
  onTicketClick,
  tickets: providedTickets,
}) => {
  const ticketService = useMemo(() => new TicketService(), []);

  // Only fetch if tickets are not provided
  const { data: ticketsData, isLoading, error } = useSWR(
    !providedTickets && sourceId ? [`tickets-by-source-${sourceType}-${sourceId}`, sourceType, sourceId] : null,
    () => ticketService.getTicketsBySource(sourceType, sourceId),
    {
      revalidateOnFocus: false,
    }
  );

  const tickets = providedTickets || ticketsData?.tickets || [];
  const isLoadingTickets = !providedTickets && isLoading;

  const getStatusColor = (status: TicketStatus): string => {
    switch (status) {
      case TicketStatus.OPEN:
        return carterColors['brand-600'];
      case TicketStatus.CLOSED:
        return carterColors['green-700'];
      case TicketStatus.APPROVED:
        return carterColors['green-700'];
      case TicketStatus.REJECTED:
        return carterColors['red-700'];
      case TicketStatus.UNASSIGNED:
      default:
        return carterColors['grey-600'];
    }
  };

  const getStatusLabel = (status: TicketStatus): string => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'Open';
      case TicketStatus.CLOSED:
        return 'Closed';
      case TicketStatus.APPROVED:
        return 'Approved';
      case TicketStatus.REJECTED:
        return 'Rejected';
      case TicketStatus.UNASSIGNED:
      default:
        return 'Unassigned';
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const handleTicketClick = (ticketId: string) => {
    if (onTicketClick) {
      onTicketClick(ticketId);
    }
  };

  if (isLoadingTickets) {
    return (
      <div className={styles.detail_card}>
        <div style={{ marginBottom: '16px' }}>
          <Typography variant="h3-semibold" color={carterColors['text-900']}>
            Related Tickets
          </Typography>
        </div>
        <Typography variant="body-regular" color={carterColors['text-500']}>
          Loading tickets...
        </Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.detail_card}>
        <div style={{ marginBottom: '16px' }}>
          <Typography variant="h3-semibold" color={carterColors['text-900']}>
            Related Tickets
          </Typography>
        </div>
        <Typography variant="body-regular" color={carterColors['text-500']}>
          Failed to load tickets. Please try again.
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.detail_card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Typography variant="h3-semibold" color={carterColors['text-900']}>
          Related Tickets
        </Typography>
        {tickets.length > 0 && (
          <Chip
            label={tickets.length.toString()}
            style={{ backgroundColor: carterColors['grey-200'], color: carterColors['text-700'] }}
          />
        )}
      </div>

      {tickets.length === 0 ? (
        <Typography variant="body-regular" color={carterColors['text-500']}>
          No tickets found for this {sourceType}.
        </Typography>
      ) : (
        <div className={styles.related_tickets_list}>
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={styles.related_ticket_item}
              onClick={() => handleTicketClick(ticket.id)}
            >
              <div className={styles.related_ticket_header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <Ticket size={18} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                    {ticket.title}
                  </Typography>
                </div>
                <Chip
                  label={getStatusLabel(ticket.status)}
                  style={{
                    backgroundColor: getStatusColor(ticket.status) + '20',
                    color: getStatusColor(ticket.status),
                    border: `1px solid ${getStatusColor(ticket.status)}40`,
                  }}
                />
              </div>
              {ticket.description && (
                <div style={{ marginTop: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {ticket.description.length > 150
                      ? `${ticket.description.substring(0, 150)}...`
                      : ticket.description}
                  </Typography>
                </div>
              )}
              <div className={styles.related_ticket_footer}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {ticket.due_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color={carterColors['text-400']} />
                      <Typography variant="caption-regular" color={carterColors['text-500']}>
                        Due: {formatDate(ticket.due_date)}
                      </Typography>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color={carterColors['text-400']} />
                    <Typography variant="caption-regular" color={carterColors['text-500']}>
                      Created: {formatDate(ticket.created_at)}
                    </Typography>
                  </div>
                </div>
                <ArrowRight size={16} color={carterColors['text-400']} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CRMRelatedTickets;
