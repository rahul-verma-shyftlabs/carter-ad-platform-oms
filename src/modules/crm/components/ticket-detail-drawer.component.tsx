import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Typography, carterColors, Chip, Button } from 'shyftlabs-dsl';
import { X, Edit, Trash2, Mail, Phone, Building2, Calendar, User, Globe, ArrowRight } from 'lucide-react';
import useSWR from 'swr';
import { useSelector } from 'react-redux';
import { Drawer } from '@/lib/material-ui';
import { IRootState } from '@/redux/reducers';
import TicketService, { Ticket, TicketStatus } from '@/services/crm/tickets/ticket.service';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert, showDialog } from '@/redux/actions';
import styles from '../styles/ticket-detail-drawer.module.scss';
import EditTicketForm from './edit-ticket-form.component';
import TicketComments from './ticket-comments.component';

interface TicketDetailDrawerProps {
  ticketId: string | null;
  onClose: () => void;
  users: Array<{ id: string; name: string; accountId: string }>;
  onTicketUpdated?: () => void;
  onTicketDeleted?: () => void;
}

const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({ 
  ticketId, 
  onClose, 
  users,
  onTicketUpdated,
  onTicketDeleted,
}) => {
  const router = useRouter();
  const ticketService = useMemo(() => new TicketService(), []);
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isEditMode, setIsEditMode] = useState(false);
  const reduxUser = useSelector((state: IRootState) => state.common.user);

  const { data: ticketData, isLoading, error, mutate } = useSWR(
    ticketId ? ['ticket', ticketId] : null,
    () => ticketService.getTicket(ticketId!),
    {
      revalidateOnFocus: false,
    }
  );

  const ticket: Ticket | undefined = ticketData;

  // Fetch related CRM object (Lead/Contact/Opportunity) if source_id exists
  const { data: relatedObject, isLoading: isLoadingRelated } = useSWR(
    ticket?.source_id && ticket?.source_type
      ? [`crm-object-${ticket.source_type}-${ticket.source_id}`, ticket.source_type, ticket.source_id]
      : null,
    async () => {
      if (!ticket?.source_id || !ticket?.source_type) return null;
      try {
        if (ticket.source_type === 'lead') {
          return await salesforceService.getLead(ticket.source_id, false);
        } else if (ticket.source_type === 'contact') {
          return await salesforceService.getContact(ticket.source_id, false);
        } else if (ticket.source_type === 'opportunity') {
          return await salesforceService.getOpportunity(ticket.source_id, false);
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch related CRM object:', error);
        return null;
      }
    },
    {
      revalidateOnFocus: false,
    }
  );

  const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
    [TicketStatus.UNASSIGNED]: { label: 'Unassigned', color: carterColors['grey-600'] },
    [TicketStatus.OPEN]: { label: 'Open', color: '#007bff' },
    [TicketStatus.CLOSED]: { label: 'Closed', color: carterColors['green-700'] },
    [TicketStatus.APPROVED]: { label: 'Approved', color: carterColors['green-700'] },
    [TicketStatus.REJECTED]: { label: 'Rejected', color: carterColors['red-700'] },
  };

  const assignedUser = ticket?.assigned_user_account_id
    ? (() => {
        const searchValue = String(ticket.assigned_user_account_id);
        // Try to find by accountId first (since field name suggests accountId)
        let user = users.find(u => u.accountId && String(u.accountId) === searchValue);
        // If not found, try by id (for backward compatibility)
        if (!user) {
          user = users.find(u => String(u.id) === searchValue);
        }
        // Debug: Log if user not found
        if (!user && process.env.NODE_ENV === 'development') {
          console.debug('Assigned user not found:', {
            searchValue,
            availableUsers: users.map(u => ({ id: u.id, accountId: u.accountId, name: u.name })),
            ticketAssignedId: ticket.assigned_user_account_id
          });
        }
        return user || null;
      })()
    : null;

  const createdByUser = ticket?.created_by_user_account_id
    ? (() => {
        const searchValue = String(ticket.created_by_user_account_id);
        // Try to find by accountId first (since field name suggests accountId)
        let user = users.find(u => u.accountId && String(u.accountId) === searchValue);
        // If not found, try by id (for backward compatibility)
        if (!user) {
          user = users.find(u => String(u.id) === searchValue);
        }
        return user || null;
      })()
    : null;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
  };

  const handleEditSuccess = async () => {
    setIsEditMode(false);
    await mutate();
    onTicketUpdated?.();
    showAlert({
      variant: 'success',
      title: 'Ticket updated successfully',
    });
  };

  const handleDelete = () => {
    if (!ticket) return;

    showDialog({
      title: 'Delete Ticket',
      description: `Are you sure you want to delete the ticket "${ticket.title}"? This action cannot be undone.`,
      confirmButtonProps: {
        label: 'Delete',
        onClick: async () => {
          try {
            await ticketService.deleteTicket(ticket.id);
            showAlert({
              variant: 'success',
              title: 'Ticket deleted successfully',
            });
            onTicketDeleted?.();
            onClose();
          } catch (error: any) {
            showAlert({
              variant: 'error' as any,
              title: error?.message || 'Failed to delete ticket',
            });
          }
        },
      },
      rejectButtonProps: {
        label: 'Cancel',
      },
    });
  };

  if (isEditMode && ticket) {
    return (
      <Drawer anchor="right" open={!!ticketId} onClose={onClose} PaperProps={{ className: styles.drawer_paper }}>
        <EditTicketForm
          ticket={ticket}
          users={users}
          onCancel={handleEditCancel}
          onSuccess={handleEditSuccess}
        />
      </Drawer>
    );
  }

  return (
    <Drawer anchor="right" open={!!ticketId} onClose={onClose} PaperProps={{ className: styles.drawer_paper }}>
      <div className={styles.drawer_container}>
        <div className={styles.drawer_header}>
          <Typography variant="h1-semibold" color={carterColors['text-900']}>
            Ticket Details
          </Typography>
          <div className={styles.header_actions}>
            {ticket && (
              <>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<Edit size={16} />}
                  label="Edit"
                  onClick={handleEdit}
                />
                <Button
                  variant="secondary"
                  size="small"
                  icon={<Trash2 size={16} />}
                  label="Delete"
                  onClick={handleDelete}
                  style={{ 
                    backgroundColor: carterColors['red-700'], 
                    color: carterColors['white'],
                    borderColor: carterColors['red-700'],
                  }}
                />
              </>
            )}
            <Button
              variant="tertiary"
              size="small"
              icon={<X size={16} />}
              onClick={onClose}
            />
          </div>
        </div>

        <div className={styles.drawer_content}>
          {isLoading ? (
            <div className={styles.loading_state}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
                Loading ticket details...
              </Typography>
            </div>
          ) : error ? (
            <div className={styles.error_state}>
              <Typography variant="body-regular" color={carterColors['red-700']}>
                Failed to load ticket details
              </Typography>
            </div>
          ) : ticket ? (
            <>
              <div className={styles.section}>
                <div style={{ marginBottom: '16px' }}>
                  <Typography variant="body-large-semibold" color={carterColors['text-900']}>
                  {ticket.title}
                </Typography>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label={statusConfig[ticket.status]?.label || ticket.status}
                    style={{
                      backgroundColor: statusConfig[ticket.status]?.color || carterColors['grey-600'],
                      color: 'white',
                    }}
                  />
                  {ticket.source_type && (
                    <Chip
                      label={ticket.source_type === 'opportunity' ? 'From Opportunity' : 'From Lead'}
                      style={{
                        backgroundColor: ticket.source_type === 'opportunity' ? '#e5f6fd' : carterColors['green-200'],
                        color: ticket.source_type === 'opportunity' ? '#007bff' : carterColors['green-700'],
                      }}
                    />
                  )}
                </div>
              </div>

              {ticket.description && (
                <div className={styles.section}>
                  <div style={{ marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                    Description
                  </Typography>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {ticket.description}
                  </Typography>
                </div>
              )}

              <div className={styles.section}>
                <div style={{ marginBottom: '12px' }}>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                  Assignment
                </Typography>
                </div>
                <div className={styles.info_row}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Assigned To:
                  </Typography>
                  {assignedUser ? (
                    <Chip
                      label={assignedUser.name}
                      style={{
                        backgroundColor: carterColors['brand-100'],
                        color: carterColors['brand-700'],
                      }}
                    />
                  ) : (
                    <Chip
                      label="Unassigned"
                      style={{
                        backgroundColor: carterColors['grey-200'],
                        color: carterColors['text-600'],
                      }}
                    />
                  )}
                </div>
                <div className={styles.info_row}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Created By:
                  </Typography>
                  {createdByUser ? (
                    <Chip
                      label={createdByUser.name}
                      style={{
                        backgroundColor: carterColors['grey-200'],
                        color: carterColors['text-700'],
                      }}
                    />
                  ) : (
                    <Typography variant="body-regular" color={carterColors['text-400']}>
                      Unknown
                    </Typography>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <div style={{ marginBottom: '12px' }}>
                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                  Dates
                </Typography>
                </div>
                <div className={styles.info_row}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Created:
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-700']}>
                    {new Date(ticket.created_at).toLocaleString()}
                  </Typography>
                </div>
                <div className={styles.info_row}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Updated:
                  </Typography>
                  <Typography variant="body-regular" color={carterColors['text-700']}>
                    {new Date(ticket.updated_at).toLocaleString()}
                  </Typography>
                </div>
                {ticket.due_date && (
                  <div className={styles.info_row}>
                    <Typography variant="body-regular" color={carterColors['text-600']}>
                      Due Date:
                    </Typography>
                    <div style={{ fontWeight: 'bold' }}>
                      <Typography variant="body-regular" color={carterColors['red-700']}>
                      {new Date(ticket.due_date).toLocaleString()}
                    </Typography>
                    </div>
                  </div>
                )}
              </div>

              {/* Related CRM Object Section (Lead/Contact/Opportunity) */}
              {ticket.source_id && ticket.source_type && (
                <div className={styles.section}>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      {ticket.source_type === 'lead' ? 'Related Lead' : ticket.source_type === 'contact' ? 'Related Contact' : 'Related Opportunity'}
                    </Typography>
                    {relatedObject && (
                      <Button
                        variant="tertiary"
                        size="small"
                        label="View Details"
                        icon={<ArrowRight size={14} />}
                        onClick={() => {
                          if (ticket.source_type === 'lead') {
                            router.push(`/crm/leads/${ticket.source_id}`);
                          } else if (ticket.source_type === 'contact') {
                            router.push(`/crm/contacts/${ticket.source_id}`);
                          } else if (ticket.source_type === 'opportunity') {
                            router.push(`/crm/opportunities/${ticket.source_id}`);
                          }
                          onClose();
                        }}
                      />
                    )}
                  </div>
                  {isLoadingRelated ? (
                    <Typography variant="body-regular" color={carterColors['text-500']}>
                      Loading {ticket.source_type} information...
                    </Typography>
                  ) : relatedObject ? (
                    <div className={styles.related_object_info}>
                      {/* Name */}
                      {relatedObject.Name && (
                        <div className={styles.info_row}>
                          <User size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              Name
                            </Typography>
                            <Typography variant="body-semibold" color={carterColors['text-900']}>
                              {relatedObject.Name}
                            </Typography>
                          </div>
                        </div>
                      )}
                      
                      {/* Email (for Lead/Contact) */}
                      {relatedObject.Email && (
                        <div className={styles.info_row}>
                          <Mail size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              Email
                            </Typography>
                            <Typography variant="body-regular" color={carterColors['text-700']}>
                              {relatedObject.Email}
                            </Typography>
                          </div>
                        </div>
                      )}
                      
                      {/* Phone (for Lead/Contact) */}
                      {relatedObject.Phone && (
                        <div className={styles.info_row}>
                          <Phone size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              Phone
                            </Typography>
                            <Typography variant="body-regular" color={carterColors['text-700']}>
                              {relatedObject.Phone}
                            </Typography>
                          </div>
                        </div>
                      )}
                      
                      {/* Company (for Lead) or Account (for Contact/Opportunity) */}
                      {(relatedObject.Company || relatedObject.Account?.Name || relatedObject.AccountId) && (
                        <div className={styles.info_row}>
                          <Building2 size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              {ticket.source_type === 'lead' ? 'Company' : 'Account'}
                            </Typography>
                            <Typography variant="body-regular" color={carterColors['text-700']}>
                              {relatedObject.Company || relatedObject.Account?.Name || relatedObject.AccountId || 'N/A'}
                            </Typography>
                          </div>
                        </div>
                      )}
                      
                      {/* Status (for Lead) or Stage (for Opportunity) */}
                      {(relatedObject.Status || relatedObject.StageName) && (
                        <div className={styles.info_row}>
                          <Calendar size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              {ticket.source_type === 'lead' ? 'Status' : 'Stage'}
                            </Typography>
                            <Chip
                              label={relatedObject.Status || relatedObject.StageName}
                              style={{
                                backgroundColor: carterColors['grey-200'],
                                color: carterColors['text-700'],
                                marginTop: '4px',
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Amount (for Opportunity) */}
                      {relatedObject.Amount && (
                        <div className={styles.info_row}>
                          <Globe size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              Amount
                            </Typography>
                            <Typography variant="body-regular" color={carterColors['text-700']}>
                              ${Number(relatedObject.Amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </div>
                        </div>
                      )}
                      
                      {/* Close Date (for Opportunity) */}
                      {relatedObject.CloseDate && (
                        <div className={styles.info_row}>
                          <Calendar size={16} color={carterColors['text-600']} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <Typography variant="caption-regular" color={carterColors['text-600']}>
                              Close Date
                            </Typography>
                            <Typography variant="body-regular" color={carterColors['text-700']}>
                              {new Date(relatedObject.CloseDate).toLocaleDateString()}
                            </Typography>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Typography variant="body-regular" color={carterColors['text-500']}>
                      {ticket.source_type} information not available
                    </Typography>
                  )}
                </div>
              )}

              {/* Comments Section */}
              {ticket && (
                <TicketComments
                  ticketId={ticket.id}
                  users={users}
                  currentUserId={reduxUser?.id}
                  onCommentAdded={() => {
                    // Optionally refresh ticket data when comment is added
                  }}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
};

export default TicketDetailDrawer;
