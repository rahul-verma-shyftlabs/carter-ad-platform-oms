import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { Typography, carterColors, Chip } from 'shyftlabs-dsl';
import { CarterSelect } from 'shyftlabs-dsl';
import {
  Plus,
  RefreshCw,
  LayoutGrid,
  Filter,
  X,
  Calendar,
  UserPlus,
  GripVertical,
  Circle,
  CheckCircle2,
  Bell,
  DollarSign,
  Building2,
  Tag,
  Clock,
  User,
  TrendingUp,
} from 'lucide-react';
import { SectionType } from 'types';
import useSWR from 'swr';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Drawer } from '@/lib/material-ui';
import { showAlert } from '@/redux/actions';
import { IRootState } from '@/redux/reducers';
import ROUTES from '@/common/routes';
import useUser from '@/contexts/user-data/user-data.hook';
import NotificationService, { Notification } from '@/services/notifications/notification.service';
import TicketService, { Ticket, TicketStatus } from '@/services/crm/tickets/ticket.service';
import UsersService from '@/services/users/users.service';
import styles from '../styles/kanban.module.scss';
import TicketDetailDrawer from './ticket-detail-drawer.component';

interface KanbanCardProps {
  ticket: Ticket;
  users: Array<{ id: string; name: string; accountId: string }>;
  onClick: (ticket: Ticket) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ ticket, users, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedUser = ticket.assigned_user_account_id
    ? (() => {
        let user = users.find(u => String(u.accountId) === String(ticket.assigned_user_account_id));
        if (!user) {
          user = users.find(u => String(u.id) === String(ticket.assigned_user_account_id));
        }
        return user || null;
      })()
    : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatShortDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatAmount = (amountValue: string | number | undefined): string => {
    if (!amountValue) return '';
    try {
      // Convert to number, handling string values
      const numValue = typeof amountValue === 'string' 
        ? parseFloat(amountValue.replace(/[^0-9.-]/g, '')) 
        : amountValue;
      
      if (isNaN(numValue)) return String(amountValue);
      
      // Format with commas
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      return String(amountValue);
    }
  };

  const createdByUser = ticket.created_by_user_account_id
    ? (() => {
        let user = users.find(u => String(u.accountId) === String(ticket.created_by_user_account_id));
        if (!user) {
          user = users.find(u => String(u.id) === String(ticket.created_by_user_account_id));
        }
        return user || null;
      })()
    : null;

  // Extract ALL data from lead_data
  const leadData = ticket.lead_data || {};
  const advertiser = leadData.company || leadData.advertiser || leadData.account_name || leadData.AccountName || '';
  const category = leadData.category || leadData.type || leadData.Type || '';
  const amount = leadData.amount || leadData.Amount || leadData.TotalOpportunityQuantity || '';
  const stage = leadData.stage || leadData.StageName || leadData.stageName || '';

  // Get ticket number from ID
  const ticketNumber = ticket.id.split('-').pop()?.substring(0, 4) || ticket.id.substring(0, 4);

  // Helper to render field with icon
  const renderField = (
    label: string, 
    value: string | null | undefined, 
    icon?: React.ReactNode,
    color?: string, 
    isLink?: boolean,
    isHighlight?: boolean
  ) => {
    if (!value) return null;
    return (
      <div style={{ 
        marginBottom: '7px', 
        minWidth: 0,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px'
      }}>
        {icon && (
          <div style={{ 
            marginTop: '2px',
            flexShrink: 0,
            color: carterColors['text-400'],
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '10px', 
            fontWeight: 600, 
            color: carterColors['text-500'], 
            marginBottom: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
          <div style={{ 
            fontSize: isHighlight ? '14px' : '12px', 
            fontWeight: isHighlight ? 700 : 500,
            color: color || carterColors['text-900'], 
            lineHeight: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%'
          }}>
            {isLink ? (
              <span style={{ color: carterColors['brand-600'], cursor: 'pointer' }}>{value}</span>
            ) : (
              <span>{value}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sourceTypeLabel = ticket.source_type === 'opportunity'
    ? 'Opp'
    : ticket.source_type === 'lead'
    ? 'Lead'
    : ticket.source_type
    ? ticket.source_type.charAt(0).toUpperCase() + ticket.source_type.slice(1)
    : '';
  const sourceTypeColor = ticket.source_type === 'opportunity'
    ? carterColors['brand-600']
    : ticket.source_type === 'lead'
    ? carterColors['light-blue']
    : carterColors['grey-600'];

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
      }}
      className={styles.kanban_card}
      onClick={() => onClick(ticket)}
    >
      <div className={styles.card_drag_handle} {...attributes} {...listeners}>
        <GripVertical size={14} color={carterColors['text-400']} />
      </div>
      
      <div className={styles.card_content} style={{ padding: '12px' }}>
        {/* Header Row with Tag and Ticket ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {ticket.source_type && (
            <Chip
              label={sourceTypeLabel}
              style={{
                backgroundColor: `${sourceTypeColor}15`,
                color: sourceTypeColor,
                fontSize: '10px',
                fontWeight: 600,
                height: '20px',
                padding: '0 8px',
                borderRadius: '12px',
                border: `1px solid ${sourceTypeColor}30`,
              }}
            />
          )}
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: carterColors['brand-600'],
            letterSpacing: '-0.3px'
          }}>
            #{ticketNumber}
          </div>
        </div>

        {/* Title */}
        <div style={{ 
          marginBottom: '4px', 
          fontSize: '15px', 
          fontWeight: 600, 
          color: carterColors['text-900'], 
          lineHeight: '18px'
        }}>
          {ticket.title}
        </div>

        {/* Description */}
        {ticket.description && (
          <div style={{ 
            marginBottom: '6px', 
            fontSize: '12px', 
            color: carterColors['text-600'], 
            lineHeight: '16px',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}>
            {ticket.description}
          </div>
        )}

        {/* Amount - Highlighted if present */}
        {amount && (
          <div style={{
            marginBottom: '6px',
            padding: '8px 10px',
            backgroundColor: `${carterColors['green-700']}08`,
            borderRadius: '8px',
            border: `1px solid ${carterColors['green-700']}20`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: carterColors['green-700'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <DollarSign size={14} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 600,
                color: carterColors['text-500'],
                marginBottom: '1px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Amount
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: carterColors['green-700'], lineHeight: '20px' }}>
                ${formatAmount(amount)}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          backgroundColor: carterColors['grey-200'], 
          margin: '8px 0',
          width: '100%'
        }} />

        {/* Two Column Grid for Fields with Icons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {renderField('Due', ticket.due_date ? formatDate(ticket.due_date) : null, <Calendar size={14} />)}
          {renderField('Assignee', assignedUser?.name, <User size={14} />)}
          {renderField(
            'Created by',
            createdByUser?.name ||
              (ticket.source_type
                ? ticket.source_type.charAt(0).toUpperCase() + ticket.source_type.slice(1)
                : null),
            <UserPlus size={14} />
          )}
          {renderField('Advertiser', advertiser, <Building2 size={14} />, carterColors['brand-600'], true)}
          {renderField('Category', category, <Tag size={14} />)}
          {renderField('Stage', stage, <TrendingUp size={14} />)}
          {renderField('Created', ticket.created_at ? formatShortDate(ticket.created_at) : null, <Clock size={14} />)}
        </div>

        {/* User Avatar Row if assigned */}
        {assignedUser && (
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${carterColors['grey-200']}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: carterColors['brand-600'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              flexShrink: 0,
              border: `2px solid ${carterColors['grey-100']}`
            }}>
              {getInitials(assignedUser.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: carterColors['text-700'],
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '14px',
              }}>
                {assignedUser.name}
              </div>
              <div style={{ fontSize: '10px', color: carterColors['text-500'], lineHeight: '12px', marginTop: '1px' }}>
                Assigned
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  users: Array<{ id: string; name: string; accountId: string }>;
  config: { label: string; color: string };
  isLoading: boolean;
  onTicketClick: (ticket: Ticket) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tickets,
  users,
  config,
  isLoading,
  onTicketClick,
}) => {
  const ticketIds = tickets.map(ticket => ticket.id);
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getStatusIcon = () => {
    switch (status) {
      case TicketStatus.UNASSIGNED:
        return <Circle size={14} color={config.color} fill={config.color} style={{ opacity: 0.3 }} />;
      case TicketStatus.OPEN:
        return <Circle size={14} color={config.color} fill={config.color} />;
      case TicketStatus.CLOSED:
        return <CheckCircle2 size={14} color={config.color} fill={config.color} />;
      case TicketStatus.APPROVED:
        return <CheckCircle2 size={14} color={config.color} fill={config.color} />;
      case TicketStatus.REJECTED:
        return <X size={14} color={config.color} fill={config.color} />;
      default:
        return <Circle size={14} color={config.color} fill={config.color} style={{ opacity: 0.3 }} />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.kanban_column_shadcn} ${isOver ? styles.kanban_column_over : ''}`}
      style={isOver ? { 
        borderColor: config.color,
        backgroundColor: `${config.color}08`
      } : {}}
    >
      <div className={styles.column_header_shadcn}>
        <div className={styles.column_title_group}>
          {getStatusIcon()}
          <div style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 600 }}>
            <Typography variant="body-semibold" color={carterColors['text-900']}>
              {config.label}
            </Typography>
          </div>
        </div>
        <div 
          className={styles.column_count}
          style={{ backgroundColor: `${config.color}15`, color: config.color }}
        >
          <span style={{ fontSize: '11px', lineHeight: '16px' }}>
            <Typography variant="caption-semibold">
              {tickets.length}
            </Typography>
          </span>
        </div>
      </div>

      <div className={styles.column_content_shadcn}>
        {isLoading ? (
          <div className={styles.loading_state_shadcn}>
            <div className={styles.loading_spinner}></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.empty_state_shadcn}>
            <Typography variant="caption-regular" color={carterColors['text-400']}>
              No tickets
            </Typography>
          </div>
        ) : (
          <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
            {tickets.map((ticket) => (
              <KanbanCard
                key={ticket.id}
                ticket={ticket}
                users={users}
                onClick={onTicketClick}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const router = useRouter();
  const { user: _user } = useUser();
  const ticketService = useMemo(() => new TicketService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; accountId: string }>>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [showTicketNotifications, setShowTicketNotifications] = useState<boolean>(false);

  // Check for ticketId in URL query params
  useEffect(() => {
    const ticketIdFromUrl = router.query.ticketId as string;
    if (ticketIdFromUrl && ticketIdFromUrl !== selectedTicketId) {
      setSelectedTicketId(ticketIdFromUrl);
      router.replace(ROUTES.CRM.TICKETS.KANBAN, undefined, { shallow: true });
    }
  }, [router.query.ticketId, selectedTicketId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersService.getAllUsers(
          {
            page: 1,
            pageSize: 400,
            filters: {
              currentUser: false,
              section: SectionType.User,
            },
            sort: '+name',
          },
          { silent: true }
        );
        
        const usersList = response.data?.usersAdvanced?.content || [];
        const totalCount = response.data?.usersAdvanced?.totalCount || 0;
        
        let allUsers = [...usersList];
        if (totalCount > 10000) {
          const totalPages = Math.ceil(totalCount / 10000);
          for (let page = 2; page <= totalPages; page++) {
            const nextResponse = await usersService.getAllUsers(
              {
                page,
                pageSize: 10000,
                filters: {
                  currentUser: false,
                  section: SectionType.User,
                },
                sort: '+name',
              },
              { silent: true }
            );
            allUsers = [...allUsers, ...(nextResponse.data?.usersAdvanced?.content || [])];
          }
        }
        
        setUsers(
          allUsers.map((u: any) => ({
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

  // Fetch tickets
  const { data: ticketsData, error, mutate, isLoading } = useSWR(
    ['tickets', selectedUserFilter],
    async () => {
      if (selectedUserFilter) {
        return await ticketService.getTickets({
          assigned_user_account_id: selectedUserFilter,
        });
      } else {
        return await ticketService.getTickets();
      }
    },
    {
      revalidateOnFocus: false,
    }
  );

  const tickets = ticketsData?.tickets || [];

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<TicketStatus, Ticket[]> = {
      [TicketStatus.UNASSIGNED]: [],
      [TicketStatus.OPEN]: [],
      [TicketStatus.CLOSED]: [],
      [TicketStatus.APPROVED]: [],
      [TicketStatus.REJECTED]: [],
    };

    tickets.forEach(ticket => {
      if (grouped[ticket.status]) {
        grouped[ticket.status].push(ticket);
      }
    });

    return grouped;
  }, [tickets]);

  const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
    [TicketStatus.UNASSIGNED]: { label: 'Unassigned', color: carterColors['grey-600'] },
    [TicketStatus.OPEN]: { label: 'Open', color: carterColors['light-blue'] },
    [TicketStatus.CLOSED]: { label: 'Closed', color: carterColors['green-700'] },
    [TicketStatus.APPROVED]: { label: 'Approved', color: carterColors['green-700'] },
    [TicketStatus.REJECTED]: { label: 'Rejected', color: carterColors['red-700'] },
  };

  const handleStatusChange = useCallback(async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await ticketService.updateTicketStatus(ticketId, newStatus);
      await mutate();
      showAlert({
        variant: 'success',
        title: 'Ticket status updated',
      });
    } catch (error: any) {
      showAlert({
        variant: 'danger',
        title: error?.message || 'Failed to update ticket status',
      });
    }
  }, [ticketService, mutate]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find(t => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const activeTicket = tickets.find(t => t.id === activeId);
    
    if (!activeTicket) return;

    let targetStatus: TicketStatus | null = null;
    
    const overTicket = tickets.find(t => t.id === over.id);
    if (overTicket) {
      targetStatus = overTicket.status;
    } else {
      const statusKeys = Object.keys(ticketsByStatus) as TicketStatus[];
      for (const status of statusKeys) {
        if (over.id === status) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus && activeTicket.status !== targetStatus) {
      await handleStatusChange(activeId, targetStatus);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleCloseDrawer = () => {
    setSelectedTicketId(null);
  };

  return (
    <div className={styles.kanban_container_shadcn}>
      {/* Header */}
      <div className={styles.kanban_header_shadcn}>
        <div className={styles.header_left_shadcn}>
          <div className={styles.header_icon_shadcn}>
            <LayoutGrid size={18} color={carterColors['brand-600']} />
          </div>
          <div className={styles.header_title_group}>
            <div style={{ fontSize: '24px', lineHeight: '32px' }}>
              <Typography variant="h1-semibold" color={carterColors['text-900']}>
                Kanban Board
              </Typography>
            </div>
            {tickets.length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '13px' }}>
                <Typography variant="caption-regular" color={carterColors['text-500']}>
                  {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} in total
                </Typography>
              </div>
            )}
          </div>
        </div>
        <div className={styles.header_right_shadcn}>
          <div className={styles.filter_wrapper_shadcn}>
            <div className={styles.filter_icon_wrapper}>
              <Filter size={14} color={carterColors['text-500']} />
            </div>
            <CarterSelect
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              placeholder="All Users"
              width="180px"
              options={[
                { label: 'All Users', value: '' },
                ...users.map((u) => ({
                  label: u.name,
                  value: String(u.id),
                })),
              ]}
            />
            {selectedUserFilter && (
              <button
                className={styles.clear_filter_btn}
                onClick={() => setSelectedUserFilter('')}
                aria-label="Clear filter"
              >
                <X size={14} color={carterColors['text-500']} />
              </button>
            )}
          </div>
          <button
            className={styles.refresh_btn_shadcn}
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw size={16} color={carterColors['text-700']} className={isLoading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
          <button
            className={styles.create_btn_shadcn}
            onClick={() => router.push(ROUTES.CRM.TICKETS.CREATE)}
          >
            <Plus size={16} color={carterColors['grey-100']} />
            <span>Create Ticket</span>
          </button>
          <TicketNotificationsButton onOpen={() => setShowTicketNotifications(true)} />
        </div>
      </div>

      {error && (
        <div className={styles.error_message_shadcn}>
          <Typography variant="body-regular" color={carterColors['red-700']}>
            {error?.message || 'Failed to load tickets'}
          </Typography>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.kanban_board_shadcn}>
          {(Object.values(TicketStatus) as TicketStatus[]).map((status) => {
            const config = statusConfig[status];
            if (!config) return null;
            
            return (
              <KanbanColumn
                key={status}
                status={status}
                tickets={ticketsByStatus[status]}
                users={users}
                config={config}
                isLoading={isLoading}
                onTicketClick={handleTicketClick}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <div className={styles.card_overlay_shadcn}>
              <Typography variant="body-semibold" color={carterColors['text-900']}>
                {activeTicket.title}
              </Typography>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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

      <TicketNotificationsDrawer
        open={showTicketNotifications}
        onClose={() => setShowTicketNotifications(false)}
        onTicketClick={(ticketId) => {
          setSelectedTicketId(ticketId);
          setShowTicketNotifications(false);
        }}
      />
    </div>
  );
};

// Ticket Notifications Button Component
const TicketNotificationsButton: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const notificationService = useMemo(() => new NotificationService(), []);
  const userAccountId = reduxUser?.id || reduxUser?.accountId || reduxUser?.email || '';

  const { data } = useSWR(
    userAccountId ? ['ticket-notifications-count', userAccountId] : null,
    async () => {
      const response = await notificationService.getNotifications(50, 0, false, userAccountId);
      // Filter for ticket notifications only
      const ticketNotifications = (response?.notifications || []).filter(
        (notif: Notification) =>
          notif.related_entity?.comment_type === 'ticket' || 
          notif.related_entity?.object_type === 'ticket' ||
          notif.notification_type?.toLowerCase().includes('ticket')
      );
      return {
        unreadCount: ticketNotifications.filter((n: Notification) => !n.is_read).length,
      };
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const unreadCount = data?.unreadCount || 0;

  return (
    <button
      className={styles.notification_btn_shadcn}
      onClick={onOpen}
      aria-label="Ticket notifications"
    >
      <Bell size={18} color={carterColors['text-700']} />
      {unreadCount > 0 && (
        <span className={styles.notification_badge_shadcn}>{unreadCount}</span>
      )}
    </button>
  );
};

// Ticket Notifications Drawer Component
const TicketNotificationsDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  onTicketClick: (ticketId: string) => void;
}> = ({ open, onClose, onTicketClick }) => {
  const router = useRouter();
  const notificationService = useMemo(() => new NotificationService(), []);
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const userAccountId = reduxUser?.id || reduxUser?.accountId || reduxUser?.email || '';

  const { data, mutate, isLoading } = useSWR(
    open && userAccountId ? ['ticket-notifications', userAccountId] : null,
    async () => {
      const response = await notificationService.getNotifications(50, 0, false, userAccountId);
      // Filter for ticket notifications only
      const ticketNotifications = (response?.notifications || []).filter(
        (notif: Notification) =>
          notif.related_entity?.comment_type === 'ticket' || 
          notif.related_entity?.object_type === 'ticket' ||
          notif.notification_type?.toLowerCase().includes('ticket')
      );
      return {
        notifications: ticketNotifications,
        unreadCount: ticketNotifications.filter((n: Notification) => !n.is_read).length,
      };
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId, userAccountId);
        await mutate();
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to mark notification as read',
        });
      }
    },
    [notificationService, mutate, userAccountId]
  );

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }

      // Extract ticket ID from notification
      if (notification.related_entity?.object_id) {
        onTicketClick(notification.related_entity.object_id);
      } else {
        // Fallback: navigate to tickets page
        router.push(ROUTES.CRM.TICKETS.KANBAN);
      }
    },
    [handleMarkAsRead, onTicketClick, router]
  );

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '90vw',
        },
      }}
    >
      <div className={styles.ticket_notifications_drawer}>
        <div className={styles.drawer_header}>
          <div className={styles.drawer_title_group}>
            <Bell size={20} color={carterColors['brand-600']} />
            <Typography variant="h2-semibold" color={carterColors['text-900']}>
              Ticket Notifications
            </Typography>
            {unreadCount > 0 && (
              <div className={styles.unread_badge}>
                <span style={{ fontSize: '11px', color: 'white' }}>
                  <Typography variant="caption-semibold">
                    {unreadCount}
                  </Typography>
                </span>
              </div>
            )}
          </div>
          <button className={styles.close_btn} onClick={onClose}>
            <X size={18} color={carterColors['text-600']} />
          </button>
        </div>

        <div className={styles.drawer_content}>
          {isLoading ? (
            <div className={styles.empty_state_notifications}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Loading notifications...
              </Typography>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty_state_notifications}>
              <Bell size={48} color={carterColors['text-400']} />
              <Typography variant="body-regular" color={carterColors['text-600']}>
                No ticket notifications
              </Typography>
            </div>
          ) : (
            <div className={styles.notifications_list_tickets}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notification_item_ticket} ${
                    !notification.is_read ? styles.unread_notification : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.notification_content_ticket}>
                    <div className={styles.notification_header_ticket}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        {notification.title}
                      </Typography>
                      {!notification.is_read && (
                        <div className={styles.unread_dot} />
                      )}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Typography variant="body-regular" color={carterColors['text-600']}>
                        {notification.message}
                      </Typography>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Typography variant="caption-regular" color={carterColors['text-400']}>
                        {formatTime(notification.created_at)}
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default KanbanBoard;
