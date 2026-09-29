import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Typography, carterColors, CarterTabs } from 'shyftlabs-dsl';
import {
  Edit,
  Trash2,
  Calendar,
  Ticket,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
} from 'lucide-react';
import useSWR from 'swr';
import { SectionType } from 'types';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import PageHeader from '@/components/page-header/page-header.component';
import { Skeleton, Dialog } from '@/lib/material-ui';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ROUTES from '@/common/routes';
import FieldItem from '@/components/field-item/field-item.component';
import ConfirmationModal from '@/components/crm/confirmation-modal.component';
import CRMComments from '@/modules/crm/components/crm-comments.component';
import CRMChatterFeed from '@/modules/crm/components/crm-chatter-feed.component';
import TicketDetailDrawer from '@/modules/crm/components/ticket-detail-drawer.component';
import UsersService from '@/services/users/users.service';
import TicketService from '@/services/crm/tickets/ticket.service';
import { TicketStatus } from '@/services/crm/tickets/ticket.service';
import LeadMeetingModal from '@/components/crm/lead-meeting-modal.component';
import LogCallModal from '@/components/crm/log-call-modal.component';
import LogEmailModal from '@/components/crm/log-email-modal.component';
import MeetingDetailModal from '@/components/crm/meeting-detail-modal.component';
import DateTimeParser from '@/lib/date-time-parser';
import styles from '@/modules/crm/styles/crm.module.scss';

const ContactDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { contactId, ref } = router.query;
  
  // Check if coming from Carter OMS
  const isFromCarter = ref === 'carter';
  const CARTER_LOGO_URL = 'https://framerusercontent.com/images/1sWkb9vy1hgOa6EJ3Hv3HaZVLRU.png?width=2000&height=2000';
  const SALESFORCE_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png';
  const logoUrl = isFromCarter ? CARTER_LOGO_URL : SALESFORCE_LOGO_URL;
  const backUrl = isFromCarter ? `${ROUTES.CRM.BASE}?tab=contacts` : `${ROUTES.CRM.SALESFORCE.DATA}?tab=contacts`;
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  const ticketService = useMemo(() => new TicketService(), []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [showLogEmailModal, setShowLogEmailModal] = useState(false);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [isLoggingEmail, setIsLoggingEmail] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string; accountId: string }>>([]);
  const [chatterRefreshTrigger, setChatterRefreshTrigger] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedTaskData, setSelectedTaskData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('0');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    upcoming: true,
    past: true,
  });

  const { data: contact, error, mutate, isLoading } = useSWR(
    contactId ? `salesforce-contact-${contactId}` : null,
    async () => {
      try {
        const result = await salesforceService.getContact(contactId as string, false);
        return result;
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 404) {
          showAlert({
            variant: 'warning',
            title: 'Connection Lost: Your Salesforce connection has expired. Please reconnect.',
          });
          router.push(ROUTES.CRM.SALESFORCE.CONNECT);
        }
        throw err;
      }
    },
    { revalidateOnFocus: false }
  );

  const handleEdit = useCallback(() => {
    router.push(`/crm/contacts/${contactId}/edit`);
  }, [router, contactId]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await salesforceService.deleteContact(contactId as string);
      showAlert({
        variant: 'success',
        title: 'Contact deleted successfully',
      });
      router.push(backUrl);
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to delete Contact',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [salesforceService, contactId, router]);

  const handleCreateTicket = useCallback(() => {
    if (!contact) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ticket_contact_data', JSON.stringify(contact));
      sessionStorage.setItem('ticket_source_type', 'contact');
    }
    router.push(ROUTES.CRM.TICKETS.CREATE);
  }, [contact, router]);

  const handleScheduleMeeting = useCallback(async (meetingData: {
    subject: string;
    start_datetime: string;
    end_datetime: string;
    description?: string;
    who_id?: string;
    what_id?: string;
  }) => {
    if (!contact || !contactId) return;
    setIsSchedulingMeeting(true);
    try {
      await salesforceService.createEvent({
        subject: meetingData.subject,
        start_datetime: meetingData.start_datetime,
        end_datetime: meetingData.end_datetime,
        description: meetingData.description,
        who_id: contactId as string,
        what_id: meetingData.what_id,
      });
      setShowMeetingModal(false);
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Meeting scheduled successfully',
      });
      await mutate();
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to schedule meeting',
      });
    } finally {
      setIsSchedulingMeeting(false);
    }
  }, [contact, contactId, salesforceService, mutate]);

  const handleLogCall = useCallback(async (callData: {
    subject: string;
    call_type?: string;
    call_duration?: number;
    description?: string;
    activity_date?: string;
    who_id?: string;
    what_id?: string;
  }) => {
    if (!contact || !contactId) return;
    setIsLoggingCall(true);
    try {
      await salesforceService.createTask({
        ...callData,
        who_id: contactId as string,
      });
      setShowLogCallModal(false);
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Call logged successfully',
      });
      await mutate();
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to log call',
      });
    } finally {
      setIsLoggingCall(false);
    }
  }, [contact, contactId, salesforceService, mutate]);

  const handleLogEmail = useCallback(async (emailData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    description?: string;
    email_date?: string;
    to_address?: string;
    from_address?: string;
  }) => {
    if (!contact || !contactId) return;
    setIsLoggingEmail(true);
    try {
      await salesforceService.createEmailTask({
        ...emailData,
        who_id: contactId as string,
      });
      setShowLogEmailModal(false);
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Email logged successfully',
      });
      await mutate();
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to log email',
      });
    } finally {
      setIsLoggingEmail(false);
    }
  }, [contact, contactId, salesforceService, mutate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch users for comments
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersService.getAllUsers(
          {
            page: 1,
            pageSize: 10000,
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

  const contactName = useMemo(() => {
    if (!contact) return '';
    const firstName = contact.FirstName || '';
    const lastName = contact.LastName || '';
    return `${firstName} ${lastName}`.trim() || 'Contact';
  }, [contact]);

  return (
    <>
      <PageHeader
        showBackButton
        isLoading={isLoading}
        title={contactName || 'Contact Details'}
        backUrl={backUrl}
        // breadcrumbs={[
        //   { label: 'Salesforce', url: ROUTES.CRM.SALESFORCE.BASE },
        // ]}
        ActionComponent={() => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="small"
              icon={<Edit size={16} />}
              onClick={handleEdit}
              label="Edit Contact"
              disabled={isLoading || isDeleting}
              title="Edit Contact"
            />
            <Button
              variant="tertiary"
              size="small"
              label="Delete Contact"
              icon={<Trash2 size={16} />}
              iconPosition="right"
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
            />
          </div>
        )}
      />
      <div className={styles.body_container}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Detail Card Skeleton */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Skeleton width={150} height={28} variant="rectangular" />
              </div>
              <div className={styles.detail_grid}>
                <div>
                  <Skeleton width={80} height={16} variant="text" style={{ marginBottom: '8px' }} />
                  <Skeleton width={200} height={20} variant="text" />
                </div>
                <div>
                  <Skeleton width={80} height={16} variant="text" style={{ marginBottom: '8px' }} />
                  <Skeleton width={200} height={20} variant="text" />
                </div>
                <div>
                  <Skeleton width={80} height={16} variant="text" style={{ marginBottom: '8px' }} />
                  <Skeleton width={200} height={20} variant="text" />
                </div>
                <div>
                  <Skeleton width={80} height={16} variant="text" style={{ marginBottom: '8px' }} />
                  <Skeleton width={200} height={20} variant="text" />
                </div>
              </div>
            </div>

            {/* Two Column Layout Skeleton */}
            <div className={styles.two_column_wrapper}>
              <div className={styles.two_column_layout}>
                {/* Left Column: Comments Skeleton */}
                <div className={styles.left_column_card}>
                  <Skeleton width={120} height={24} variant="text" style={{ marginBottom: '16px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px' }}>
                        <Skeleton width={40} height={40} variant="circular" />
                        <div style={{ flex: 1 }}>
                          <Skeleton width="60%" height={16} variant="text" style={{ marginBottom: '8px' }} />
                          <Skeleton width="100%" height={14} variant="text" />
                          <Skeleton width="80%" height={14} variant="text" style={{ marginTop: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Tabs Skeleton */}
                <div className={styles.right_column_card}>
                  <div style={{ marginBottom: '16px' }}>
                    <Skeleton width={300} height={40} variant="rectangular" style={{ borderRadius: '8px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Skeleton width="100%" height={120} variant="rectangular" style={{ borderRadius: '8px' }} />
                    <Skeleton width="100%" height={120} variant="rectangular" style={{ borderRadius: '8px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : contact ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Contact Details */}
            <div className={styles.detail_card} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Contact Details
                </Typography>
                {logoUrl && (
                  <Image
                    src={logoUrl}
                    alt={isFromCarter ? 'Carter' : 'Salesforce'}
                    width={isFromCarter ? 20 : 50}
                    height={isFromCarter ? 20 : 34}
                    style={{ objectFit: 'contain' }}
                  />
                )}
              </div>
              <div className={styles.detail_grid}>
                <FieldItem
                  label="Name"
                  value={contactName || '---'}
                />
                <FieldItem
                  label="Email"
                  value={
                    contact.Email ? (
                      <a
                        href={`mailto:${contact.Email}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {contact.Email}
                      </a>
                    ) : (
                      '---'
                    )
                  }
                />
                <FieldItem
                  label="Contact"
                  value={
                    (contact.Phone || contact.MobilePhone) ? (
                      <a
                        href={`tel:${contact.Phone || contact.MobilePhone}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {contact.Phone || contact.MobilePhone}
                      </a>
                    ) : (
                      '---'
                    )
                  }
                />
                <FieldItem
                  label="Owner"
                  value={contact.Owner?.Name ?? contact.OwnerId ?? '---'}
                />
              </div>
            </div>

            {/* Two Column Layout: Comments (Left) and Tabs (Right) */}
            {contact && contactId && (
              <div className={styles.two_column_wrapper}>
                <div className={styles.two_column_layout}>
                  {/* Left Column: Comments */}
                  <div className={styles.left_column_card}>
                    <CRMComments
                      objectType="contact"
                      objectId={contactId as string}
                      users={users}
                      onCommentAdded={() => {
                        // Optionally refresh contact data when comment is added
                      }}
                    />
                  </div>

                  {/* Right Column: Tabs */}
                  <div className={styles.right_column_card}>
                    <div className={styles.tabs_section}>
                      <CarterTabs
                        tabs={[
                          {
                            title: 'Details',
                            component: () => (
                              <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Contact Information */}
                                <div className={styles.detail_card}>
                                  <div style={{ marginBottom: '20px' }}>
                                    <Typography variant="h2-semibold" color={carterColors['text-900']}>
                                      Contact Information
                                    </Typography>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                    <FieldItem
                                      label="First Name"
                                      value={contact.FirstName || '-----'}
                                    />
                                    <FieldItem
                                      label="Last Name"
                                      value={contact.LastName || '-----'}
                                    />
                                    <FieldItem
                                      label="Email"
                                      value={
                                        contact.Email ? (
                                          <a
                                            href={`mailto:${contact.Email}`}
                                            style={{
                                              color: carterColors['brand-600'],
                                              textDecoration: 'none',
                                            }}
                                          >
                                            {contact.Email}
                                          </a>
                                        ) : (
                                          '-----'
                                        )
                                      }
                                    />
                                    <FieldItem
                                      label="Phone"
                                      value={
                                        contact.Phone ? (
                                          <a
                                            href={`tel:${contact.Phone}`}
                                            style={{
                                              color: carterColors['brand-600'],
                                              textDecoration: 'none',
                                            }}
                                          >
                                            {contact.Phone}
                                          </a>
                                        ) : (
                                          '-----'
                                        )
                                      }
                                    />
                                    {contact.MobilePhone && (
                                      <FieldItem
                                        label="Mobile"
                                        value={
                                          <a
                                            href={`tel:${contact.MobilePhone}`}
                                            style={{
                                              color: carterColors['brand-600'],
                                              textDecoration: 'none',
                                            }}
                                          >
                                            {contact.MobilePhone}
                                          </a>
                                        }
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Professional Information */}
                                <div className={styles.detail_card}>
                                  <div style={{ marginBottom: '20px' }}>
                                    <Typography variant="h2-semibold" color={carterColors['text-900']}>
                                      Professional Information
                                    </Typography>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                    {contact.Title && (
                                      <FieldItem
                                        label="Title"
                                        value={contact.Title}
                                      />
                                    )}
                                    {contact.Department && (
                                      <FieldItem
                                        label="Department"
                                        value={contact.Department}
                                      />
                                    )}
                                    {contact.Account?.Name && (
                                      <FieldItem
                                        label="Account"
                                        value={contact.Account.Name}
                                      />
                                    )}
                                    {contact.ReportsTo?.Name && (
                                      <FieldItem
                                        label="Reports To"
                                        value={contact.ReportsTo.Name}
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Address Information */}
                                {(contact.MailingCity || contact.MailingState || 
                                  contact.MailingCountry || contact.OtherCity || 
                                  contact.OtherState || contact.OtherCountry) && (
                                  <div className={styles.detail_card}>
                                    <div style={{ marginBottom: '20px' }}>
                                      <Typography variant="h2-semibold" color={carterColors['text-900']}>
                                        Address Information
                                      </Typography>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                      {contact.MailingCity && (
                                        <FieldItem
                                          label="Mailing Address"
                                          value={[
                                            contact.MailingStreet,
                                            contact.MailingCity,
                                            contact.MailingState,
                                            contact.MailingPostalCode,
                                            contact.MailingCountry
                                          ].filter(Boolean).join(', ') || '-----'}
                                        />
                                      )}
                                      {contact.OtherCity && (
                                        <FieldItem
                                          label="Other Address"
                                          value={[
                                            contact.OtherStreet,
                                            contact.OtherCity,
                                            contact.OtherState,
                                            contact.OtherPostalCode,
                                            contact.OtherCountry
                                          ].filter(Boolean).join(', ') || '-----'}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* System Information */}
                                <div className={styles.detail_card}>
                                  <div style={{ marginBottom: '20px' }}>
                                    <Typography variant="h2-semibold" color={carterColors['text-900']}>
                                      System Information
                                    </Typography>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                    {contact.CreatedDate && (
                                      <FieldItem
                                        label="Created Date"
                                        value={formatDate(contact.CreatedDate)}
                                      />
                                    )}
                                    {contact.LastModifiedDate && (
                                      <FieldItem
                                        label="Last Modified"
                                        value={formatDate(contact.LastModifiedDate)}
                                      />
                                    )}
                                    {contact.Id && (
                                      <FieldItem
                                        label={isFromCarter ? 'Carter ID' : 'Salesforce ID'}
                                        value={
                                          <span style={{ fontFamily: 'monospace' }}>{contact.Id}</span>
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: 'Activity',
                            component: () => {
                              // Fetch meetings
                              const { data: eventsData, isLoading: isLoadingEvents } = useSWR(
                                contactId ? [`crm-events-${contactId}`, contactId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordEvents(contactId as string, 50),
                                { revalidateOnFocus: false }
                              );

                              // Fetch tickets
                              const { data: ticketsData, isLoading: isLoadingTickets } = useSWR(
                                contactId ? [`tickets-by-source-contact-${contactId}`, 'contact', contactId] : null,
                                () => ticketService.getTicketsBySource('contact', contactId as string),
                                { revalidateOnFocus: false }
                              );

                              // Fetch tasks (calls)
                              const { data: tasksData, isLoading: isLoadingTasks } = useSWR(
                                contactId ? [`crm-tasks-${contactId}`, contactId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordTasks(contactId as string, 50),
                                { revalidateOnFocus: false }
                              );

                              const isLoadingActivities = isLoadingEvents || isLoadingTickets || isLoadingTasks;

                              const events = eventsData?.records || [];
                              const tickets = ticketsData?.tickets || [];
                              const tasks = tasksData?.records || [];

                              // Combine and sort activities
                              const combinedActivities = useMemo(() => {
                                const activities: Array<{
                                  id: string;
                                  type: 'meeting' | 'ticket' | 'call' | 'email';
                                  title: string;
                                  description: string;
                                  date: string;
                                  dateDisplay: string;
                                  icon: React.ReactNode;
                                  color: string;
                                  data: any;
                                }> = [];

                                // Add meetings
                                events.forEach((event: any) => {
                                  activities.push({
                                    id: event.Id,
                                    type: 'meeting',
                                    title: event.Subject || 'Meeting',
                                    description: event.Description || 'You have an upcoming event',
                                    date: event.StartDateTime || event.CreatedDate || new Date().toISOString(),
                                    dateDisplay: event.StartDateTime 
                                      ? new Date(event.StartDateTime).toLocaleString('en-US', {
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true,
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : 'No date',
                                    icon: <Calendar size={16} />,
                                    color: carterColors['brand-600'],
                                    data: event,
                                  });
                                });

                                // Add tickets
                                tickets.forEach((ticket: any) => {
                                  const dueDate = ticket.due_date ? new Date(ticket.due_date) : null;
                                  const isOverdue = dueDate && dueDate < new Date() && ticket.status !== TicketStatus.CLOSED;
                                  activities.push({
                                    id: ticket.id,
                                    type: 'ticket',
                                    title: ticket.title || 'Ticket',
                                    description: ticket.description || 'You have an upcoming task',
                                    date: ticket.due_date || ticket.created_at || new Date().toISOString(),
                                    dateDisplay: ticket.due_date 
                                      ? new Date(ticket.due_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : 'No due date',
                                    icon: <CheckCircle2 size={16} />,
                                    color: isOverdue 
                                      ? carterColors['red-700']
                                      : ticket.status === TicketStatus.CLOSED
                                      ? carterColors['green-700']
                                      : carterColors['brand-600'],
                                    data: ticket,
                                  });
                                });

                                // Add tasks (calls and emails)
                                tasks.forEach((task: any) => {
                                  const callDate = task.ActivityDate || task.CreatedDate || new Date().toISOString();
                                  const duration = task.CallDurationInSeconds;
                                  const durationText = duration ? ` (${Math.floor(duration / 60)} min)` : '';
                                  
                                  const subject = task.Subject || '';
                                  const description = task.Description || '';
                                  const subjectUpper = subject.toUpperCase().trim();
                                  const isEmail = subjectUpper.startsWith('EMAIL:') ||
                                                  (!task.CallType && (description.includes('To:') || description.includes('From:')));
                                  
                                  const estTimeZone = 'America/New_York';
                                  let dateDisplay = 'No date';
                                  if (task.ActivityDate) {
                                    const activityMoment = DateTimeParser(task.ActivityDate);
                                    if (task.CreatedDate) {
                                      const createdMoment = DateTimeParser.tz(task.CreatedDate, estTimeZone);
                                      dateDisplay = activityMoment.format('MMM D') + ', ' + createdMoment.format('h:mm A') + ' EST';
                                    } else {
                                      dateDisplay = activityMoment.format('MMM D');
                                    }
                                  } else if (task.CreatedDate) {
                                    const createdMoment = DateTimeParser.tz(task.CreatedDate, estTimeZone);
                                    dateDisplay = createdMoment.format('MMM D, YYYY, h:mm A') + ' EST';
                                  }
                                  
                                  const emailPrefixIndex = subjectUpper.indexOf('EMAIL:');
                                  let displayTitle = task.Subject || (isEmail ? 'Email' : 'Call');
                                  if (isEmail && emailPrefixIndex === 0) {
                                    const colonIndex = subject.indexOf(':');
                                    if (colonIndex !== -1) {
                                      displayTitle = subject.substring(colonIndex + 1).trim();
                                    }
                                  }
                                  
                                  let displayDescription = task.Description || (isEmail ? 'Email sent' : 'Call logged');
                                  if (isEmail && task.Description) {
                                    const toMatch = task.Description.match(/To:\s*([^\n]+)/);
                                    const fromMatch = task.Description.match(/From:\s*([^\n]+)/);
                                    const emailBody = task.Description.split('\n\n').slice(1).join('\n\n').trim();
                                    
                                    if (toMatch || fromMatch) {
                                      const parts: string[] = [];
                                      if (toMatch) parts.push(`To: ${toMatch[1].trim()}`);
                                      if (fromMatch) parts.push(`From: ${fromMatch[1].trim()}`);
                                      displayDescription = parts.join(' • ');
                                      
                                      if (emailBody) {
                                        const truncatedBody = emailBody.length > 100 
                                          ? emailBody.substring(0, 100) + '...' 
                                          : emailBody;
                                        displayDescription = `${displayDescription} - ${truncatedBody}`;
                                      }
                                    } else if (emailBody) {
                                      displayDescription = emailBody.length > 150 
                                        ? emailBody.substring(0, 150) + '...' 
                                        : emailBody;
                                    }
                                  }
                                  
                                  activities.push({
                                    id: task.Id,
                                    type: isEmail ? 'email' : 'call',
                                    title: displayTitle,
                                    description: displayDescription + (isEmail ? '' : durationText),
                                    date: callDate,
                                    dateDisplay: dateDisplay,
                                    icon: isEmail ? <Mail size={16} style={{ color: '#FFFFFF' }} /> : <Phone size={16} style={{ color: '#FFFFFF' }} />,
                                    color: isEmail ? carterColors['light-blue'] : carterColors['brand-600'],
                                    data: task,
                                  });
                                });

                                // Sort by date (most recent first)
                                return activities.sort((a, b) => {
                                  const dateA = new Date(a.date).getTime();
                                  const dateB = new Date(b.date).getTime();
                                  return dateB - dateA;
                                });
                              }, [events, tickets, tasks]);

                              const upcomingActivities = combinedActivities.filter(activity => {
                                const activityDate = new Date(activity.date);
                                return activityDate >= new Date();
                              });

                              const pastActivities = combinedActivities.filter(activity => {
                                const activityDate = new Date(activity.date);
                                return activityDate < new Date();
                              });

                              const handleActivityClick = (activity: typeof combinedActivities[0]) => {
                                if (activity.type === 'meeting') {
                                  setSelectedMeetingId(activity.id);
                                } else if (activity.type === 'ticket') {
                                  setSelectedTicketId(activity.id);
                                } else if (activity.type === 'call' || activity.type === 'email') {
                                  if (activity.data) {
                                    setSelectedTaskData(activity.data);
                                  }
                                }
                              };

                              const formatActivityDate = (dateString: string) => {
                                const estTimeZone = 'America/New_York';
                                const activityMoment = DateTimeParser.tz(dateString, estTimeZone);
                                const now = DateTimeParser.tz(estTimeZone);
                                
                                const today = now.clone().startOf('day');
                                const activityDate = activityMoment.clone().startOf('day');
                                const yesterday = today.clone().subtract(1, 'day');
                                
                                if (activityDate.isSame(today, 'day')) {
                                  return 'Today';
                                }
                                if (activityDate.isSame(yesterday, 'day')) {
                                  return 'Yesterday';
                                }
                                return activityMoment.format('MMM D, YYYY');
                              };

                              return (
                                <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column' }}>
                                  {/* Action Buttons */}
                                  <div className={styles.action_buttons_container}>
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Log a Call"
                                      icon={<Phone size={14} />}
                                      onClick={() => setShowLogCallModal(true)}
                                      disabled={isLoading || !contact}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Send Email"
                                      icon={<Mail size={14} />}
                                      onClick={() => setShowLogEmailModal(true)}
                                      disabled={isLoading || !contact}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Meeting"
                                      icon={<Calendar size={14} />}
                                      onClick={() => setShowMeetingModal(true)}
                                      disabled={isLoading || !contact}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Ticket"
                                      icon={<Ticket size={14} />}
                                      onClick={handleCreateTicket}
                                      disabled={isLoading || !contact}
                                    />
                                  </div>

                                  {/* Loading State */}
                                  {isLoadingActivities && (
                                    <div className={styles.detail_card} style={{ padding: '40px', textAlign: 'center' }}>
                                      <Skeleton width="100%" height={60} variant="rectangular" style={{ marginBottom: '16px', borderRadius: '8px' }} />
                                      <Skeleton width="100%" height={60} variant="rectangular" style={{ marginBottom: '16px', borderRadius: '8px' }} />
                                      <Skeleton width="100%" height={60} variant="rectangular" style={{ borderRadius: '8px' }} />
                                    </div>
                                  )}

                                  {/* No Activities Message */}
                                  {!isLoadingActivities && upcomingActivities.length === 0 && pastActivities.length === 0 && (
                                    <div className={styles.detail_card} style={{ padding: '40px', textAlign: 'center' }}>
                                      <Typography variant="body-regular" color={carterColors['text-500']}>
                                        No activities found
                                      </Typography>
                                    </div>
                                  )}

                                  {/* Upcoming & Overdue Section */}
                                  {!isLoadingActivities && upcomingActivities.length > 0 && (
                                    <div className={styles.detail_card}>
                                      <div 
                                        style={{
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '8px', 
                                          marginBottom: '16px',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedSections(prev => ({ ...prev, upcoming: !prev.upcoming }))}
                                      >
                                        {expandedSections.upcoming ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                                          Upcoming & Overdue
                                        </Typography>
                                      </div>
                                      {expandedSections.upcoming && (
                                        <div className={styles.activity_timeline}>
                                          {upcomingActivities.map((activity, index) => (
                                            <div
                                              key={activity.id}
                                              className={styles.activity_item}
                                              onClick={() => handleActivityClick(activity)}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <div className={styles.activity_icon_line}>
                                                <div 
                                                  className={styles.activity_icon}
                                                  style={{ backgroundColor: activity.color }}
                                                >
                                                  <div style={{
                                                    color: '#FFFFFF',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%'
                                                  }}>
                                                    {activity.icon}
                                                  </div>
                                                </div>
                                                {index < upcomingActivities.length - 1 && (
                                                  <div 
                                                    className={styles.activity_line}
                                                    style={{ 
                                                      backgroundColor: activity.color,
                                                      opacity: 0.3
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              <div className={styles.activity_content}>
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '4px',
                                                  }}
                                                >
                                                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                                                    {activity.title}
                                                  </Typography>
                                                  <ChevronRight size={16} color={carterColors['text-400']} />
                                                </div>
                                                <div 
                                                  style={{ 
                                                    marginBottom: '8px',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.5',
                                                    maxHeight: '3em',
                                                  }}
                                                >
                                                  <Typography variant="body-regular" color={carterColors['text-600']}>
                                                    {activity.description}
                                                  </Typography>
                                                </div>
                                                <Typography variant="caption-regular" color={carterColors['text-500']}>
                                                  {activity.dateDisplay} | {formatActivityDate(activity.date)}
                                                </Typography>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Past Activities */}
                                  {!isLoadingActivities && pastActivities.length > 0 && (
                                    <div className={styles.detail_card}>
                                      <div 
                                        style={{
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '8px', 
                                          marginBottom: '16px',
                                          marginTop: '24px',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedSections(prev => ({ ...prev, past: !prev.past }))}
                                      >
                                        {expandedSections.past ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                                          Past Activities
                                        </Typography>
                                      </div>
                                      {expandedSections.past && (
                                        <div className={styles.activity_timeline}>
                                          {pastActivities.slice(0, 10).map((activity, index) => (
                                            <div
                                              key={activity.id}
                                              className={styles.activity_item}
                                              onClick={() => handleActivityClick(activity)}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <div className={styles.activity_icon_line}>
                                                <div 
                                                  className={styles.activity_icon}
                                                  style={{ backgroundColor: activity.color }}
                                                >
                                                  <div style={{
                                                    color: '#FFFFFF',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%'
                                                  }}>
                                                    {activity.icon}
                                                  </div>
                                                </div>
                                                {index < Math.min(pastActivities.length, 10) - 1 && (
                                                  <div 
                                                    className={styles.activity_line}
                                                    style={{ 
                                                      backgroundColor: activity.color,
                                                      opacity: 0.3
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              <div className={styles.activity_content}>
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '4px',
                                                  }}
                                                >
                                                  <Typography variant="body-semibold" color={carterColors['text-900']}>
                                                    {activity.title}
                                                  </Typography>
                                                  <ChevronRight size={16} color={carterColors['text-400']} />
                                                </div>
                                                <div 
                                                  style={{ 
                                                    marginBottom: '8px',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: '1.5',
                                                    maxHeight: '3em',
                                                  }}
                                                >
                                                  <Typography variant="body-regular" color={carterColors['text-600']}>
                                                    {activity.description}
                                                  </Typography>
                                                </div>
                                                <Typography variant="caption-regular" color={carterColors['text-500']}>
                                                  {activity.dateDisplay} | {formatActivityDate(activity.date)}
                                                </Typography>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          },
                          {
                            title: 'Chatter',
                            component: () => (
                              <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className={styles.detail_card}>
                                  <CRMChatterFeed
                                    recordId={contactId as string}
                                    refreshTrigger={chatterRefreshTrigger}
                                    onRefresh={() => {
                                      // Optionally refresh contact data when feed is refreshed
                                    }}
                                  />
                                </div>
                              </div>
                            ),
                          },
                        ]}
                        activeTab={activeTab}
                        onChange={(index: string) => setActiveTab(index)}
                        variant="pill"
                        noPadding
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              Failed to load contact details. Please try again.
            </Typography>
          </div>
        ) : null}
      </div>

      {/* Meeting Modal */}
      <LeadMeetingModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSchedule={handleScheduleMeeting}
        contact={contact}
        isLoading={isSchedulingMeeting}
      />

      <LogCallModal
        open={showLogCallModal}
        onClose={() => setShowLogCallModal(false)}
        onLogCall={handleLogCall}
        contact={contact}
        isLoading={isLoggingCall}
      />

      <LogEmailModal
        open={showLogEmailModal}
        onClose={() => setShowLogEmailModal(false)}
        onLogEmail={handleLogEmail}
        contact={contact}
        isLoading={isLoggingEmail}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact"
        message="Are you sure you want to delete this Contact? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        open={!!selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
        meetingId={selectedMeetingId}
        onUpdated={() => {
          mutate();
          setChatterRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Task Detail Modal */}
      {selectedTaskData && (
        <Dialog
          open={!!selectedTaskData}
          onClose={() => setSelectedTaskData(null)}
          maxWidth="md"
          fullWidth
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <Typography variant="h2-semibold" color={carterColors['text-900']}>
                Task Details
              </Typography>
              <Button
                variant="tertiary"
                size="small"
                icon={<Trash2 size={16} />}
                onClick={() => setSelectedTaskData(null)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedTaskData.Subject && (
                <FieldItem
                  label="Subject"
                  value={selectedTaskData.Subject}
                />
              )}
              {selectedTaskData.Description && (
                <FieldItem
                  label="Description"
                  value={selectedTaskData.Description}
                />
              )}
              {selectedTaskData.ActivityDate && (
                <FieldItem
                  label="Activity Date"
                  value={formatDate(selectedTaskData.ActivityDate)}
                />
              )}
              {selectedTaskData.CallDurationInSeconds && (
                <FieldItem
                  label="Duration"
                  value={`${Math.floor(selectedTaskData.CallDurationInSeconds / 60)} minutes`}
                />
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Ticket Detail Drawer */}
      <TicketDetailDrawer
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        users={users}
        onTicketUpdated={() => {
          // Tickets will refresh automatically via SWR
        }}
        onTicketDeleted={() => {
          setSelectedTicketId(null);
        }}
      />
    </>
  );
};

ContactDetailPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Contact Details' }}>{page}</InternalLayout>;
};

export default ContactDetailPage;
