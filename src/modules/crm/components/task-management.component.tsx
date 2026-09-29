import React, { useState, useMemo, useEffect } from 'react';
import { Typography, carterColors, Chip } from 'shyftlabs-dsl';
import useSWR from 'swr';
import { SectionType } from 'types';
import TicketService, { Ticket, TicketStatus } from '@/services/crm/tickets/ticket.service';
import UsersService from '@/services/users/users.service';
import styles from '../styles/task-management.module.scss';
import TicketDetailDrawer from './ticket-detail-drawer.component';

type TaskStatusFilter = 'open' | 'closed' | 'approved' | 'rejected';

const TaskManagement: React.FC = () => {
  const ticketService = useMemo(() => new TicketService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TaskStatusFilter>('open');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; accountId: string }>>([]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersService.getAllUsers(
          {
            page: 1,
            pageSize: 500,
            filters: {
              currentUser: false,
              section: SectionType.User,
            },
            sort: '+name',
          },
          { silent: true }
        );
        
        const usersList = response.data?.usersAdvanced?.content || [];
        setUsers(
          usersList.map((u: any) => ({
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            accountId: u.accountId || '',
          }))
        );
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (usersService) {
      fetchUsers();
    }
  }, [usersService]);

  // Map task status filter to ticket status
  const getTicketStatusFromFilter = (filter: TaskStatusFilter): TicketStatus[] => {
    switch (filter) {
      case 'open':
        return [TicketStatus.OPEN];
      case 'closed':
        return [TicketStatus.CLOSED];
      case 'approved':
        return [TicketStatus.APPROVED];
      case 'rejected':
        return [TicketStatus.REJECTED];
      default:
        return [];
    }
  };

  // Fetch all tickets for counts
  const { data: allTicketsData } = useSWR(
    'all-tickets',
    async () => {
      return await ticketService.getTickets();
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch tickets based on status filter
  const { data: ticketsData, error, mutate, isLoading } = useSWR(
    ['tickets', selectedStatusFilter],
    async () => {
      const statuses = getTicketStatusFromFilter(selectedStatusFilter);
      const allTickets = await ticketService.getTickets();
      return {
        tickets: allTickets.tickets.filter(ticket => statuses.includes(ticket.status)),
      };
    },
    {
      revalidateOnFocus: false,
    }
  );

  const tickets = ticketsData?.tickets || [];

  // Get counts for each status
  const statusCounts = useMemo(() => {
    const allTickets = allTicketsData?.tickets || [];
    return {
      open: allTickets.filter(t => t.status === TicketStatus.OPEN).length,
      closed: allTickets.filter(t => t.status === TicketStatus.CLOSED).length,
      approved: allTickets.filter(t => t.status === TicketStatus.APPROVED).length,
      rejected: allTickets.filter(t => t.status === TicketStatus.REJECTED).length,
    };
  }, [allTicketsData]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleCloseDrawer = () => {
    setSelectedTicketId(null);
  };

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown';
    const user = users.find(u => String(u.accountId) === String(userId) || String(u.id) === String(userId));
    return user?.name || 'Unknown';
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className={styles.task_management_container}>
      <div style={{ marginBottom: '24px' }}>
        <Typography variant="h1-semibold" color={carterColors['text-900']}>
          Task management
        </Typography>
      </div>

      <div className={styles.status_filters}>
        <button
          className={`${styles.status_filter_btn} ${selectedStatusFilter === 'open' ? styles.status_filter_active : ''}`}
          onClick={() => setSelectedStatusFilter('open')}
        >
          <Typography variant="body-semibold" color={selectedStatusFilter === 'open' ? carterColors['text-900'] : carterColors['text-600']}>
            Open ({statusCounts.open})
          </Typography>
        </button>
        <button
          className={`${styles.status_filter_btn} ${selectedStatusFilter === 'closed' ? styles.status_filter_active : ''}`}
          onClick={() => setSelectedStatusFilter('closed')}
        >
          <Typography variant="body-semibold" color={selectedStatusFilter === 'closed' ? carterColors['text-900'] : carterColors['text-600']}>
            Closed ({statusCounts.closed})
          </Typography>
        </button>
        <button
          className={`${styles.status_filter_btn} ${selectedStatusFilter === 'approved' ? styles.status_filter_active : ''}`}
          onClick={() => setSelectedStatusFilter('approved')}
        >
          <Typography variant="body-semibold" color={selectedStatusFilter === 'approved' ? carterColors['text-900'] : carterColors['text-600']}>
            Approved ({statusCounts.approved})
          </Typography>
        </button>
        <button
          className={`${styles.status_filter_btn} ${selectedStatusFilter === 'rejected' ? styles.status_filter_active : ''}`}
          onClick={() => setSelectedStatusFilter('rejected')}
        >
          <Typography variant="body-semibold" color={selectedStatusFilter === 'rejected' ? carterColors['text-900'] : carterColors['text-600']}>
            Rejected ({statusCounts.rejected})
          </Typography>
        </button>
      </div>

      <div className={styles.tickets_list}>
        {isLoading ? (
          <div className={styles.loading_state}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Loading tickets...
            </Typography>
          </div>
        ) : error ? (
          <div className={styles.error_state}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              {error?.message || 'Failed to load tickets'}
            </Typography>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.empty_state}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              No tickets found
            </Typography>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className={styles.ticket_card} onClick={() => handleTicketClick(ticket)}>
              <div className={styles.ticket_card_header}>
                <Typography variant="h3-semibold" color={carterColors['brand-600']}>
                  Ticket #{ticket.id.slice(-3)}
                </Typography>
                <Chip
                  label={ticket.source_type === 'opportunity' ? 'Opportunity' : 'Lead'}
                  style={{
                    backgroundColor: ticket.source_type === 'opportunity' ? '#e5f6fd' : carterColors['green-200'],
                    color: ticket.source_type === 'opportunity' ? '#007bff' : carterColors['green-700'],
                  }}
                />
              </div>

              <div className={styles.ticket_card_body}>
                 <div className={styles.ticket_column}>
                   <div className={styles.ticket_field}>
                     <Typography variant="caption-regular" color={carterColors['text-600']}>
                       Subject
                     </Typography>
                     <Typography variant="body-semibold" color={carterColors['text-900']}>
                       {ticket.title}
                     </Typography>
                    {ticket.description && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="body-regular" color={carterColors['text-600']}>
                          {ticket.description}
                        </Typography>
                      </div>
                    )}
                   </div>
                   <div className={styles.ticket_field}>
                     <Typography variant="caption-regular" color={carterColors['text-600']}>
                       Due date
                     </Typography>
                     <Typography variant="body-regular" color={carterColors['text-900']}>
                       {formatDate(ticket.due_date)}
                     </Typography>
                   </div>
                 </div>

                <div className={styles.ticket_column}>
                  <div className={styles.ticket_field}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Assignee
                    </Typography>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {getUserName(ticket.assigned_user_account_id) || 'Unassigned'}
                    </Typography>
                  </div>
                  <div className={styles.ticket_field}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                      Created by
                    </Typography>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {ticket.source_type === 'opportunity' ? 'Salesforce' : getUserName(ticket.created_by_user_account_id)}
                    </Typography>
                  </div>
                </div>

                 <div className={styles.ticket_column}>
                   <div className={styles.ticket_field}>
                     <Typography variant="caption-regular" color={carterColors['text-600']}>
                       Advertiser
                     </Typography>
                     <div style={{ cursor: 'pointer' }}>
                       <Typography variant="body-regular" color={carterColors['brand-600']}>
                         {ticket.lead_data?.advertiser || ticket.lead_data?.Company || ticket.lead_data?.Account?.Name || 'N/A'}
                       </Typography>
                     </div>
                   </div>
                   <div className={styles.ticket_field}>
                     <Typography variant="caption-regular" color={carterColors['text-600']}>
                       Campaign
                     </Typography>
                     <div style={{ cursor: 'pointer' }}>
                       <Typography variant="body-regular" color={carterColors['brand-600']}>
                         {ticket.lead_data?.campaign ? `#${ticket.lead_data.campaign}` : ticket.lead_data?.Name ? `#${ticket.lead_data.Name}` : 'N/A'}
                       </Typography>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TicketDetailDrawer
        ticketId={selectedTicketId}
        onClose={handleCloseDrawer}
        users={users}
        onTicketUpdated={() => {
          mutate();
        }}
        onTicketDeleted={() => {
          mutate();
          setSelectedTicketId(null);
        }}
      />
    </div>
  );
};

export default TaskManagement;
