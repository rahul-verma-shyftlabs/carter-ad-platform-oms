import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Typography, carterColors, CarterTabs, Tooltip } from 'shyftlabs-dsl';
import {
  Edit,
  Trash2,
  Calendar,
  Check,
  Ticket,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
  X,
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
import LeadConversionModal from '@/components/crm/lead-conversion-modal.component';
import LeadMeetingModal from '@/components/crm/lead-meeting-modal.component';
import LogCallModal from '@/components/crm/log-call-modal.component';
import LogEmailModal from '@/components/crm/log-email-modal.component';
import ConfirmationModal from '@/components/crm/confirmation-modal.component';
import CRMComments from '@/modules/crm/components/crm-comments.component';
import CRMChatterFeed from '@/modules/crm/components/crm-chatter-feed.component';
import TicketDetailDrawer from '@/modules/crm/components/ticket-detail-drawer.component';
import UsersService from '@/services/users/users.service';
import TicketService from '@/services/crm/tickets/ticket.service';
import { TicketStatus } from '@/services/crm/tickets/ticket.service';
import MeetingDetailModal from '@/components/crm/meeting-detail-modal.component';
import useAccount from '@/contexts/account/account-data.hook';
import DateTimeParser from '@/lib/date-time-parser';
import styles from '@/modules/crm/styles/crm.module.scss';

const LeadDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { leadId, ref } = router.query;
  useAccount();
  
  // Check if coming from Carter OMS
  const isFromCarter = ref === 'carter';
  const CARTER_LOGO_URL = 'https://framerusercontent.com/images/1sWkb9vy1hgOa6EJ3Hv3HaZVLRU.png?width=2000&height=2000';
  const SALESFORCE_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png';
  const logoUrl = isFromCarter ? CARTER_LOGO_URL : SALESFORCE_LOGO_URL;
  const backUrl = isFromCarter ? `${ROUTES.CRM.BASE}?tab=leads` : `${ROUTES.CRM.SALESFORCE.DATA}?tab=leads`;
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [showLogEmailModal, setShowLogEmailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const ticketService = useMemo(() => new TicketService(), []);

  const { data: lead, error, mutate, isLoading } = useSWR(
    leadId ? `salesforce-lead-${leadId}` : null,
    async () => {
      try {
        const result = await salesforceService.getLead(leadId as string, false);
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

  // Fetch available lead statuses
  const { data: leadStatuses = [], error: statusesError } = useSWR(
    'lead-statuses',
    async () => {
      try {
        const statuses = await salesforceService.getLeadStatuses();
        return statuses || [];
      } catch (err) {
        console.error('Error fetching lead statuses:', err);
        // Fallback to common statuses if API fails
        return ['Open - Not Contacted', 'Working - Contacted', 'Closed - Converted', 'Closed - Not Converted'];
      }
    },
    { revalidateOnFocus: false }
  );

  const handleEdit = useCallback(() => {
    router.push(`/crm/leads/${leadId}/edit`);
  }, [router, leadId]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await salesforceService.deleteLead(leadId as string);
      showAlert({
        variant: 'success',
        title: 'Lead deleted successfully',
      });
      router.push(backUrl);
    } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to delete Lead',
        });
    } finally {
      setIsDeleting(false);
    }
  }, [salesforceService, leadId, router]);

  const handleCreateTicket = useCallback(() => {
    if (!lead) return;
    // Store lead data in sessionStorage and navigate to ticket creation page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ticket_lead_data', JSON.stringify(lead));
      sessionStorage.setItem('ticket_source_type', 'lead');
    }
    router.push(ROUTES.CRM.TICKETS.CREATE);
  }, [lead, router]);


  const handleScheduleMeeting = useCallback(async (eventData: {
    subject: string;
    start_datetime: string;
    end_datetime: string;
    what_id?: string;
    who_id?: string;
    location?: string;
    description?: string;
    is_all_day?: boolean;
    reminder_datetime?: string;
  }) => {
    setIsSchedulingMeeting(true);
    try {
      await salesforceService.createEvent(eventData);
      showAlert({
        variant: 'success',
        title: 'Meeting scheduled successfully',
      });
      setShowMeetingModal(false);
      // Refresh lead data and trigger meetings refresh
      await mutate();
      setChatterRefreshTrigger(prev => (prev || 0) + 1);
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to schedule meeting',
      });
    } finally {
      setIsSchedulingMeeting(false);
    }
  }, [salesforceService, mutate]);

  const handleLogCall = useCallback(async (callData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    call_type?: string;
    call_duration?: number;
    description?: string;
    call_date?: string;
  }) => {
    setIsLoggingCall(true);
    try {
      await salesforceService.createTask(callData);
      showAlert({
        variant: 'success',
        title: 'Call logged successfully',
      });
      setShowLogCallModal(false);
      // Refresh lead data and trigger activities refresh
      await mutate();
      setChatterRefreshTrigger(prev => (prev || 0) + 1);
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to log call',
      });
    } finally {
      setIsLoggingCall(false);
    }
  }, [salesforceService, mutate]);

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
    setIsLoggingEmail(true);
    try {
      await salesforceService.createEmailTask(emailData);
      showAlert({
        variant: 'success',
        title: 'Email logged successfully',
      });
      setShowLogEmailModal(false);
      // Refresh lead data and trigger activities refresh
      await mutate();
      setChatterRefreshTrigger(prev => (prev || 0) + 1);
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to log email',
      });
    } finally {
      setIsLoggingEmail(false);
    }
  }, [salesforceService, mutate]);

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

  const isFinalStatus = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    return statusLower.includes('converted') || 
           (statusLower.includes('closed') && statusLower.includes('converted'));
  };
  
  const isClosedNotConverted = (status: string) => {
    if (!status) return false;
    const statusLower = status.toLowerCase().trim();
    // Check for "Closed - Not Converted" pattern - must have "closed", "not", but NOT "converted"
    // Use regex to match exact pattern or check for "not" before "converted"
    return /^closed\s*-\s*not\s*converted$/i.test(statusLower) ||
           (statusLower.includes('closed') && 
            statusLower.includes('not') && 
            !statusLower.includes('converted'));
  };

  const isClosedConverted = (status: string) => {
    if (!status) return false;
    const statusLower = status.toLowerCase().trim();
    // Check for "Closed - Converted" pattern - must have "closed" and "converted", but NOT "not converted"
    // Use regex to match exact pattern or ensure "converted" appears without "not" before it
    return /^closed\s*-\s*converted$/i.test(statusLower) ||
           (statusLower.includes('closed') && 
            statusLower.includes('converted') && 
            !(statusLower.includes('not') && statusLower.indexOf('not') < statusLower.indexOf('converted')));
  };


  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!lead || newStatus === lead.Status) return;

    // Check if this is Closed - Not Converted - update immediately without modal
    if (isClosedNotConverted(newStatus)) {
      setIsUpdatingStatus(true);
      try {
        await salesforceService.updateLeadStatus(leadId as string, newStatus);
        await mutate();
        // Refresh Chatter feed to show the status change
        setChatterRefreshTrigger(prev => prev + 1);
        showAlert({
          variant: 'success',
          title: 'Lead status updated to Closed - Not Converted',
        });
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to update lead status',
        });
      } finally {
        setIsUpdatingStatus(false);
      }
      return;
    }

    // Check if this is a final status that should trigger conversion modal
    if (isFinalStatus(newStatus)) {
      // Show conversion modal - user will convert, which will update status
      setShowConversionModal(true);
      return;
    }

    // For non-final statuses, update immediately
    setIsUpdatingStatus(true);
    try {
      await salesforceService.updateLeadStatus(leadId as string, newStatus);
      await mutate();
      // Refresh Chatter feed to show the status change
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Lead status updated successfully',
      });
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to update lead status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [lead, leadId, salesforceService, mutate]);

  const handleConvertLead = useCallback(async (convertOptions: {
    convertToContact: boolean;
    convertToOpportunity: boolean;
    opportunityName?: string;
    opportunityAmount?: number;
    opportunityCloseDate?: string;
    opportunityStage?: string;
  }) => {
    setIsUpdatingStatus(true);
    try {
      // Format data according to backend schema
      const convertData: any = {
        convertToContact: convertOptions.convertToContact,
        convertToOpportunity: convertOptions.convertToOpportunity,
      };

      if (convertOptions.convertToContact && lead) {
        convertData.contactData = {
          FirstName: lead.FirstName,
          LastName: lead.LastName,
          Email: lead.Email,
          Phone: lead.Phone,
        };
      }

      if (convertOptions.convertToOpportunity) {
        convertData.opportunityData = {
          Name: convertOptions.opportunityName || lead?.Company || 'New Opportunity',
          Amount: convertOptions.opportunityAmount || 0,
          CloseDate: convertOptions.opportunityCloseDate || new Date().toISOString().split('T')[0],
          StageName: convertOptions.opportunityStage || 'Prospecting',
        };
      }

      const result = await salesforceService.convertLead(leadId as string, convertData);
      await mutate();
      // Refresh Chatter feed to show the conversion
      setChatterRefreshTrigger(prev => prev + 1);
      setShowConversionModal(false);
      
      // If an opportunity was created, redirect to it
      if (result?.opportunityId) {
        showAlert({
          variant: 'success',
          title: 'Lead converted successfully. Redirecting to opportunity...',
        });
        router.push(`/crm/opportunities/${result.opportunityId}`);
      } else {
        showAlert({
          variant: 'success',
          title: 'Lead converted successfully',
        });
      }
    } catch (err: any) {
      // Extract error message from response
      let errorMessage = 'Failed to convert lead';
      
      if (err?.response?.data?.detail) {
        // Backend error with detail field
        errorMessage = err.response.data.detail;
      } else if (err?.response?.data?.message) {
        // Backend error with message field
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        // Direct error message
        errorMessage = err.message;
      }
      
      // Check for duplicate detection error
      if (errorMessage.includes('DUPLICATES_DETECTED') || errorMessage.includes('Use one of these records')) {
        errorMessage =
          'Duplicate records detected. A contact with the same email or phone number already exists. ' +
          'Please use one of the existing records or update the lead information.';
      }
      
      showAlert({
        variant: 'warning',
        title: errorMessage,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [leadId, lead, salesforceService, mutate]);

  const leadName = useMemo(() => {
    if (!lead) return '';
    const firstName = lead.FirstName || '';
    const lastName = lead.LastName || '';
    return `${firstName} ${lastName}`.trim() || 'Lead';
  }, [lead]);

  // Fetch users for comments - optional, fail gracefully if API has issues
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersService.getAllUsers(
          {
            page: 1,
            pageSize: 600,
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
      } catch {
        // Silently fail - comments will work without user mentions
        // The error is likely due to invalid enum values in permissions (e.g., COMPREHENSIVE_LEVEL)
        // Set empty array so comments component still works
        setUsers([]);
      }
    };

    if (usersService) {
      fetchUsers();
    }
  }, [usersService]);

  return (
    <>
      <PageHeader
        showBackButton
        isLoading={isLoading}
        title={leadName || 'Lead Details'}
        backUrl={backUrl}
        ActionComponent={() => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="small"
              label="Edit Lead"
              icon={<Edit size={16} />}
              iconPosition="right"
              onClick={handleEdit}
              disabled={isLoading || isDeleting}
            />
            <Button
              variant="tertiary"
              size="small"
              label="Delete Lead"
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
              {/* Status Progression Bar Skeleton */}
              <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                <Skeleton width="100%" height={48} variant="rectangular" style={{ borderRadius: '8px' }} />
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
        ) : lead ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Lead Details */}
            <div className={styles.detail_card} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Lead Details
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
                  label="Company"
                  value={lead.Company || '-----'}
                />
                <FieldItem
                  label="Name"
                  value={leadName || '-----'}
                />
                <FieldItem
                  label="Email"
                  value={
                    lead.Email ? (
                      <a
                        href={`mailto:${lead.Email}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {lead.Email}
                      </a>
                    ) : (
                      '-----'
                    )
                  }
                />
                <FieldItem
                  label="Phone"
                  value={
                    lead.Phone ? (
                      <a
                        href={`tel:${lead.Phone}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {lead.Phone}
                      </a>
                    ) : (
                      '-----'
                    )
                  }
                />
                <FieldItem
                  label="Owner"
                  value={lead.Owner?.Name ?? lead.OwnerId ?? '-----'}
                />
              </div>
              
              {/* Status Progression Bar */}
              {leadStatuses.length > 0 && lead.Status ? (
                <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                  <div className={styles.opportunity_progress}>
                    {(() => {
                      const currentStatusIndex = leadStatuses.indexOf(lead.Status || '');
                      const lastCompletedIndex = currentStatusIndex > 0 ? currentStatusIndex - 1 : -1;
                      // Show last completed step (if exists) + next 3 steps at full width
                      const startIndex = lastCompletedIndex >= 0 ? lastCompletedIndex : currentStatusIndex;
                      const fullWidthEndIndex = Math.min(leadStatuses.length, startIndex + 3);
                      
                      return leadStatuses.map((status: string, index: number) => {
                        // Determine if this step should be collapsed or full width
                        // Show all steps, but collapse those outside the visible range
                        const isInFullWidthRange = index >= startIndex && index < fullWidthEndIndex;
                        const shouldCollapse = !isInFullWidthRange;
                        
                      const isCompleted = index < currentStatusIndex;
                      const isActive = index === currentStatusIndex;
                      const isFuture = index > currentStatusIndex;
                      const isClickable = !isUpdatingStatus && (isActive || isFuture || (isCompleted && index === currentStatusIndex - 1));
                        // Collapse if it's completed or beyond the full width range
                        const shouldBeCollapsed = isCompleted || shouldCollapse;
                      const statusIsClosedNotConverted = isClosedNotConverted(status);
                      const statusIsClosedConverted = isClosedConverted(status);
                      // Also check if current lead status is Closed - Not Converted or Closed - Converted
                      const currentStatusIsClosedNotConverted = isClosedNotConverted(lead.Status || '');
                      const currentStatusIsClosedConverted = isClosedConverted(lead.Status || '');
                      const shouldShowRed =
                        (statusIsClosedNotConverted && isActive) ||
                        (currentStatusIsClosedNotConverted && isActive && status === lead.Status);
                      const shouldShowGreen =
                        (statusIsClosedConverted && isActive) ||
                        (currentStatusIsClosedConverted && isActive && status === lead.Status);
                      
                        const finalIsClickable = isClickable;
                      
                      const segmentContent = (
                        <div
                          key={status}
                          className={`${styles.progress_segment} ${
                            isCompleted ? styles.progress_segment_completed : ''
                          } ${isActive ? styles.progress_segment_active : ''} ${
                            isFuture ? styles.progress_segment_future : ''
                          } ${
                            finalIsClickable ? styles.progress_segment_clickable : ''
                          } ${
                            shouldShowRed ? styles.progress_segment_closed_lost : ''
                          }`}
                          onClick={() => {
                            if (finalIsClickable && status !== lead.Status) {
                              handleStatusChange(status);
                            }
                          }}
                          style={{
                            cursor: finalIsClickable ? 'pointer' : 'default',
                            position: 'relative',
                            backgroundColor: shouldShowRed 
                              ? carterColors['red-700'] 
                              : shouldShowGreen 
                                ? carterColors['green-700'] 
                                : undefined,
                            width: shouldBeCollapsed ? '60px' : '100%',
                            flex: shouldBeCollapsed ? '0 0 60px' : '1',
                            transition: 'width 0.2s ease, flex 0.2s ease'
                          }}
                          title={!shouldBeCollapsed ? (finalIsClickable 
                            ? `Click to change status to ${status}` 
                            : status) : undefined}
                        >
                          <div
                            className={styles.progress_segment_content}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                              position: 'relative',
                              height: '100%',
                            }}
                          >
                            {!shouldBeCollapsed && (
                              <div 
                                className={styles.progress_segment_label} 
                                style={{ 
                                  opacity: 1, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: '100%',
                                  height: '100%',
                                  pointerEvents: 'none'
                                }}
                              >
                                <Typography 
                                  variant="caption-semibold" 
                                  color={isActive 
                                    ? 'white' 
                                    : carterColors['text-600']}
                                >
                                  {status}
                                </Typography>
                              </div>
                            )}
                            <div
                              className={styles.progress_segment_indicator}
                              style={{
                                position: 'relative',
                                zIndex: 1,
                                marginLeft: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                              }}
                            >
                              {(isCompleted || shouldShowGreen) && (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: 'white',
                                  color: shouldShowGreen ? carterColors['green-700'] : carterColors['brand-600']
                                }}>
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}
                              {isActive && !isCompleted && !shouldShowGreen && (
                                <div style={{ 
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: 'white',
                                  border: `2px solid ${shouldShowRed ? carterColors['red-700'] : carterColors['brand-600']}`
                                }} />
                              )}
                              {isFuture && (
                                <div style={{ 
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: carterColors['grey-400']
                                }} />
                              )}
                            </div>
                          </div>
                        </div>
                      );

                        return shouldBeCollapsed ? (
                          <Tooltip 
                            key={status} 
                            title={finalIsClickable 
                              ? `Click to change status to ${status}` 
                              : status} 
                            placement="top"
                          >
                            {segmentContent}
                          </Tooltip>
                        ) : (
                          segmentContent
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    {statusesError ? 'Failed to load statuses' : 'Loading statuses...'}
                  </Typography>
                </div>
              )}
            </div>

            {/* Two Column Layout: Comments (Left) and Tabs (Right) */}
            {lead && leadId && (
              <div className={styles.two_column_wrapper}>
                <div className={styles.two_column_layout}>
                  {/* Left Column: Comments */}
                  <div className={styles.left_column_card}>
                    <CRMComments
                      objectType="lead"
                      objectId={leadId as string}
                      users={users}
                      onCommentAdded={() => {
                        // Optionally refresh lead data when comment is added
                      }}
                    />
            </div>

                  {/* Right Column: Tabs (50%) */}
                  <div className={styles.right_column_card}>
                    <div className={styles.tabs_section}>
                      <CarterTabs
                        tabs={[
                          {
                            title: 'Details',
                            component: () => (
                              <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Lead Information */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Lead Information
                </Typography>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <FieldItem
                  label="First Name"
                  value={lead.FirstName || '-----'}
                />
                <FieldItem
                  label="Last Name"
                  value={lead.LastName || '-----'}
                />
                <FieldItem
                  label="Email"
                  value={
                    lead.Email ? (
                      <a
                        href={`mailto:${lead.Email}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {lead.Email}
                      </a>
                    ) : (
                      '-----'
                    )
                  }
                />
                <FieldItem
                  label="Phone"
                  value={
                    lead.Phone ? (
                      <a
                        href={`tel:${lead.Phone}`}
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {lead.Phone}
                      </a>
                    ) : (
                      '-----'
                    )
                  }
                />
                <FieldItem
                  label="Title"
                  value={lead.Title || '-----'}
                />
                <FieldItem
                  label="Status"
                  value={lead.Status || '-----'}
                />
              </div>
            </div>

            {/* Company Information */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Company Information
                </Typography>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <FieldItem
                  label="Company"
                  value={lead.Company || '-----'}
                />
                <FieldItem
                  label="Industry"
                  value={lead.Industry || '-----'}
                />
                <FieldItem
                  label="Lead Source"
                  value={lead.LeadSource || '-----'}
                />
                <FieldItem
                  label="Rating"
                  value={lead.Rating || '-----'}
                />
                <FieldItem
                  label="Website"
                  value={
                    lead.Website ? (
                      <a
                        href={lead.Website.startsWith('http') ? lead.Website : `https://${lead.Website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: carterColors['brand-600'],
                          textDecoration: 'none',
                        }}
                      >
                        {lead.Website}
                      </a>
                    ) : (
                      '-----'
                    )
                  }
                />
              </div>
            </div>

            {/* Address Information */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Address Information
                </Typography>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <FieldItem
                  label="Street"
                  value={lead.Street || '-----'}
                />
                <FieldItem
                  label="City"
                  value={lead.City || '-----'}
                />
                <FieldItem
                  label="State"
                  value={lead.State || '-----'}
                />
                <FieldItem
                  label="Postal Code"
                  value={lead.PostalCode || '-----'}
                />
                <FieldItem
                  label="Country"
                  value={lead.Country || '-----'}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Additional Information
                </Typography>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldItem
                    label="Description"
                    value={lead.Description || '-----'}
                  />
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  System Information
                </Typography>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <FieldItem
                  label="Created Date"
                  value={lead.CreatedDate ? formatDate(lead.CreatedDate) : '-----'}
                />
                <FieldItem
                  label="Last Modified"
                  value={lead.LastModifiedDate ? formatDate(lead.LastModifiedDate) : '-----'}
                />
                <FieldItem
                  label={isFromCarter ? 'Carter ID' : 'Salesforce ID'}
                  value={
                    lead.Id ? (
                      <span style={{ fontFamily: 'monospace' }}>{lead.Id}</span>
                    ) : (
                      '-----'
                    )
                  }
                />
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
                                leadId ? [`crm-events-${leadId}`, leadId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordEvents(leadId as string, 50),
                                { revalidateOnFocus: false }
                              );

                              // Fetch tickets
                              const { data: ticketsData, isLoading: isLoadingTickets } = useSWR(
                                leadId ? [`tickets-by-source-lead-${leadId}`, 'lead', leadId] : null,
                                () => ticketService.getTicketsBySource('lead', leadId as string),
                                { revalidateOnFocus: false }
                              );

                              // Fetch tasks (calls)
                              const { data: tasksData, isLoading: isLoadingTasks } = useSWR(
                                leadId ? [`crm-tasks-${leadId}`, leadId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordTasks(leadId as string, 50),
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
                                  
                                  // Check if this is an email (Subject starts with "Email: " - this is the primary indicator)
                                  const subject = task.Subject || '';
                                  const description = task.Description || '';
                                  const subjectUpper = subject.toUpperCase().trim();
                                  // Primary detection: Subject starts with "EMAIL:" (with or without space after colon)
                                  // Secondary detection: No CallType AND has email addresses in description
                                  const isEmail = subjectUpper.startsWith('EMAIL:') ||
                                                  (!task.CallType && (description.includes('To:') || description.includes('From:')));
                                  
                                  // Format date display in EST timezone
                                  const estTimeZone = 'America/New_York';
                                  let dateDisplay = 'No date';
                                  if (task.ActivityDate) {
                                    // ActivityDate is just a date (YYYY-MM-DD), format with time if available
                                    const activityMoment = DateTimeParser(task.ActivityDate);
                                    // If there's a CreatedDate, use its time component
                                    if (task.CreatedDate) {
                                      const createdMoment = DateTimeParser.tz(task.CreatedDate, estTimeZone);
                                      dateDisplay = activityMoment.format('MMM D') + ', ' + createdMoment.format('h:mm A') + ' EST';
                                    } else {
                                      dateDisplay = activityMoment.format('MMM D');
                                    }
                                  } else if (task.CreatedDate) {
                                    // CreatedDate is UTC, convert to EST timezone
                                    const createdMoment = DateTimeParser.tz(task.CreatedDate, estTimeZone);
                                    dateDisplay = createdMoment.format('MMM D, YYYY, h:mm A') + ' EST';
                                  }
                                  
                                  // Remove "Email: " prefix from title for display
                                  const emailPrefixIndex = subjectUpper.indexOf('EMAIL:');
                                  let displayTitle = task.Subject || (isEmail ? 'Email' : 'Call');
                                  if (isEmail && emailPrefixIndex === 0) {
                                    // Remove "Email:" prefix (case-insensitive, handle with or without space)
                                    const colonIndex = subject.indexOf(':');
                                    if (colonIndex !== -1) {
                                      displayTitle = subject.substring(colonIndex + 1).trim();
                                    }
                                  }
                                  
                                  // Format description for emails - extract email addresses
                                  let displayDescription = task.Description || (isEmail ? 'Email sent' : 'Call logged');
                                  if (isEmail && task.Description) {
                                    // For emails, show a cleaner, more concise description similar to calls
                                    const toMatch = task.Description.match(/To:\s*([^\n]+)/);
                                    const fromMatch = task.Description.match(/From:\s*([^\n]+)/);
                                    const emailBody = task.Description.split('\n\n').slice(1).join('\n\n').trim();
                                    
                                    if (toMatch || fromMatch) {
                                      // Show a concise format: "To: email@example.com" or "From: email@example.com"
                                      const parts: string[] = [];
                                      if (toMatch) parts.push(`To: ${toMatch[1].trim()}`);
                                      if (fromMatch) parts.push(`From: ${fromMatch[1].trim()}`);
                                      displayDescription = parts.join(' • ');
                                      
                                      // If there's email body, append a truncated version
                                      if (emailBody) {
                                        const truncatedBody = emailBody.length > 100 
                                          ? emailBody.substring(0, 100) + '...' 
                                          : emailBody;
                                        displayDescription = `${displayDescription} - ${truncatedBody}`;
                                      }
                                    } else if (emailBody) {
                                      // If no To/From but has body, just show truncated body
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
                                  // Show raw JSON data directly
                                  if (activity.data) {
                                    setSelectedTaskData(activity.data);
                                  }
                                }
                              };

                              const formatActivityDate = (dateString: string) => {
                                // Parse the ISO date string and convert to EST timezone
                                const estTimeZone = 'America/New_York';
                                const activityMoment = DateTimeParser.tz(dateString, estTimeZone);
                                const now = DateTimeParser.tz(estTimeZone);
                                
                                // Get dates at start of day in EST timezone
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
                                      disabled={isLoading || !lead}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Send Email"
                                      icon={<Mail size={14} />}
                                      onClick={() => setShowLogEmailModal(true)}
                                      disabled={isLoading || !lead}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Meeting"
                                      icon={<Calendar size={14} />}
                                      onClick={() => setShowMeetingModal(true)}
                                      disabled={isLoading || !lead}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Ticket"
                                      icon={<Ticket size={14} />}
                                      onClick={handleCreateTicket}
                                      disabled={isLoading || !lead}
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
            {/* Chatter Feed Section */}
              <div className={styles.detail_card}>
                <CRMChatterFeed
                  recordId={leadId as string}
                  refreshTrigger={chatterRefreshTrigger}
                  onRefresh={() => {
                    // Optionally refresh lead data when feed is refreshed
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
              Failed to load lead details. Please try again. {error?.message || 'Unknown error'}
            </Typography>
          </div>
        ) : null}
      </div>

      {/* Lead Conversion Modal */}
      <LeadConversionModal
        open={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        onConvert={handleConvertLead}
        lead={lead}
        isLoading={isUpdatingStatus}
      />


      {/* Meeting Modal */}
      <LeadMeetingModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSchedule={handleScheduleMeeting}
        lead={lead}
        isLoading={isSchedulingMeeting}
      />

      <LogCallModal
        open={showLogCallModal}
        onClose={() => setShowLogCallModal(false)}
        onLogCall={handleLogCall}
        lead={lead}
        isLoading={isLoggingCall}
      />

      <LogEmailModal
        open={showLogEmailModal}
        onClose={() => setShowLogEmailModal(false)}
        onLogEmail={handleLogEmail}
        lead={lead}
        isLoading={isLoggingEmail}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message="Are you sure you want to delete this Lead? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        open={!!selectedMeetingId}
        meetingId={selectedMeetingId || ''}
        onClose={() => setSelectedMeetingId(null)}
        onUpdated={() => {
          setChatterRefreshTrigger(prev => prev + 1);
        }}
        onDeleted={() => {
          setSelectedMeetingId(null);
          setChatterRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Task Data Modal */}
      {selectedTaskData && (
        <Dialog open={!!selectedTaskData} onClose={() => setSelectedTaskData(null)} maxWidth="md" fullWidth>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') ? (
                  <Mail size={24} color={carterColors['light-blue']} />
                ) : (
                  <Phone size={24} color={carterColors['brand-600']} />
                )}
                <Typography variant="h1-semibold" color={carterColors['text-900']}>
                  {selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') ? 'Email Details' : 'Call Details'}
                </Typography>
              </div>
              <Button
                variant="tertiary"
                size="small"
                icon={<X size={16} />}
                onClick={() => setSelectedTaskData(null)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Subject */}
              {selectedTaskData.Subject && (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-700']}>
                      Subject
                    </Typography>
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: carterColors['grey-100'], 
                    borderRadius: '8px' 
                  }}>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {selectedTaskData.Subject.startsWith('Email: ') 
                        ? selectedTaskData.Subject.substring(7) 
                        : selectedTaskData.Subject}
                    </Typography>
                  </div>
                </div>
              )}

              {/* Status & Priority Row */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {selectedTaskData.Status && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        Status
                      </Typography>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      backgroundColor: carterColors['grey-100'], 
                      borderRadius: '8px' 
                    }}>
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        {selectedTaskData.Status}
                      </Typography>
                    </div>
                  </div>
                )}
                {selectedTaskData.Priority && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        Priority
                      </Typography>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      backgroundColor: carterColors['grey-100'], 
                      borderRadius: '8px' 
                    }}>
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        {selectedTaskData.Priority}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>

              {/* Call Type & Duration Row (for calls only - not emails) */}
              {selectedTaskData.CallType && !selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        Call Type
                      </Typography>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      backgroundColor: carterColors['grey-100'], 
                      borderRadius: '8px' 
                    }}>
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        {selectedTaskData.CallType}
                      </Typography>
                    </div>
                  </div>
                  {selectedTaskData.CallDurationInSeconds && (
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Typography variant="body-semibold" color={carterColors['text-700']}>
                          Duration
                        </Typography>
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        backgroundColor: carterColors['grey-100'], 
                        borderRadius: '8px' 
                      }}>
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {Math.floor(selectedTaskData.CallDurationInSeconds / 60)} min {selectedTaskData.CallDurationInSeconds % 60} sec
                        </Typography>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {selectedTaskData.ActivityDate && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        Activity Date
                      </Typography>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      backgroundColor: carterColors['grey-100'], 
                      borderRadius: '8px' 
                    }}>
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        {selectedTaskData.ActivityDate}
                      </Typography>
                    </div>
                  </div>
                )}
                {selectedTaskData.CreatedDate && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        Created Date
                      </Typography>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      backgroundColor: carterColors['grey-100'], 
                      borderRadius: '8px' 
                    }}>
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        {new Date(selectedTaskData.CreatedDate).toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })} EST
                      </Typography>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Addresses (for emails) */}
              {selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') && selectedTaskData.Description && (
                <>
                  {(() => {
                    const toMatch = selectedTaskData.Description.match(/To:\s*([^\n]+)/);
                    const fromMatch = selectedTaskData.Description.match(/From:\s*([^\n]+)/);
                    const emailBody = selectedTaskData.Description.split('\n\n').slice(1).join('\n\n').trim();
                    
                    return (
                      <>
                        {toMatch && (
                          <div>
                            <div style={{ marginBottom: '8px' }}>
                              <Typography variant="body-semibold" color={carterColors['text-700']}>
                                To
                              </Typography>
                            </div>
                            <div style={{ 
                              padding: '12px 16px', 
                              backgroundColor: carterColors['grey-100'], 
                              borderRadius: '8px' 
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-900']}>
                                {toMatch[1].trim()}
                              </Typography>
                            </div>
                          </div>
                        )}
                        {fromMatch && (
                          <div>
                            <div style={{ marginBottom: '8px' }}>
                              <Typography variant="body-semibold" color={carterColors['text-700']}>
                                From
                              </Typography>
                            </div>
                            <div style={{ 
                              padding: '12px 16px', 
                              backgroundColor: carterColors['grey-100'], 
                              borderRadius: '8px' 
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-900']}>
                                {fromMatch[1].trim()}
                              </Typography>
                            </div>
                          </div>
                        )}
                        {emailBody && (
                          <div>
                            <div style={{ marginBottom: '8px' }}>
                              <Typography variant="body-semibold" color={carterColors['text-700']}>
                                Email Body
                              </Typography>
                            </div>
                            <div style={{ 
                              padding: '12px 16px', 
                              backgroundColor: carterColors['grey-100'], 
                              borderRadius: '8px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}>
                              <Typography variant="body-regular" color={carterColors['text-900']}>
                                {emailBody}
                              </Typography>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* Description/Notes (for calls or emails without parsed addresses) */}
              {selectedTaskData.Description && 
               !(selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') && 
                 (selectedTaskData.Description.includes('To:') || selectedTaskData.Description.includes('From:'))) && (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-700']}>
                      {selectedTaskData.Subject?.toUpperCase().startsWith('EMAIL:') ? 'Email Body' : 'Notes'}
                    </Typography>
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: carterColors['grey-100'], 
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {selectedTaskData.Description}
                    </Typography>
                  </div>
                </div>
              )}

              {/* IDs Section */}
              <div style={{ 
                padding: '16px', 
                backgroundColor: carterColors['grey-100'], 
                borderRadius: '8px',
                border: `1px solid ${carterColors['grey-200']}`
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Record Information
                  </Typography>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTaskData.Id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ minWidth: '100px' }}>
                        <Typography variant="body-regular" color={carterColors['text-600']}>
                          ID:
                        </Typography>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {selectedTaskData.Id}
                        </Typography>
                      </span>
                    </div>
                  )}
                  {selectedTaskData.WhatId && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ minWidth: '100px' }}>
                        <Typography variant="body-regular" color={carterColors['text-600']}>
                          What ID:
                        </Typography>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {selectedTaskData.WhatId}
                        </Typography>
                      </div>
                    </div>
                  )}
                  {selectedTaskData.WhoId && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ minWidth: '100px' }}>
                        <Typography variant="body-regular" color={carterColors['text-600']}>
                          Who ID:
                        </Typography>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {selectedTaskData.WhoId}
                        </Typography>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

LeadDetailPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Lead Details' }}>{page}</InternalLayout>;
};

export default LeadDetailPage;
