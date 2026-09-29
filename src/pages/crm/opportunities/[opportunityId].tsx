import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Button, Typography, carterColors, CarterTabs, Tooltip } from 'shyftlabs-dsl';
import {
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  Check,
  Ticket,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
  X,
  Users,
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
import OpportunityNavigationModal from '@/components/crm/opportunity-navigation-modal.component';
import ClosedStageSelectionModal from '@/components/crm/closed-stage-selection-modal.component';
import ConfirmationModal from '@/components/crm/confirmation-modal.component';
import CRMComments from '@/modules/crm/components/crm-comments.component';
import CRMChatterFeed from '@/modules/crm/components/crm-chatter-feed.component';
import TicketDetailDrawer from '@/modules/crm/components/ticket-detail-drawer.component';
import UsersService from '@/services/users/users.service';
import TicketService from '@/services/crm/tickets/ticket.service';
import { TicketStatus } from '@/services/crm/tickets/ticket.service';
import MeetingDetailModal from '@/components/crm/meeting-detail-modal.component';
import LeadMeetingModal from '@/components/crm/lead-meeting-modal.component';
import LogCallModal from '@/components/crm/log-call-modal.component';
import LogEmailModal from '@/components/crm/log-email-modal.component';
import useAccount from '@/contexts/account/account-data.hook';
import DateTimeParser from '@/lib/date-time-parser';
import styles from '@/modules/crm/styles/crm.module.scss';
import FieldItem from '@/components/field-item/field-item.component';

const OpportunityDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { opportunityId, ref } = router.query;
  useAccount();
  
  // Check if coming from Carter OMS
  const isFromCarter = ref === 'carter';
  const CARTER_LOGO_URL = 'https://framerusercontent.com/images/1sWkb9vy1hgOa6EJ3Hv3HaZVLRU.png?width=2000&height=2000';
  const SALESFORCE_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/960px-Salesforce.com_logo.svg.png';
  const logoUrl = isFromCarter ? CARTER_LOGO_URL : SALESFORCE_LOGO_URL;
  const backUrl = isFromCarter ? `${ROUTES.CRM.BASE}?tab=opportunities` : `${ROUTES.CRM.SALESFORCE.DATA}?tab=opportunities`;
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showClosedStageModal, setShowClosedStageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
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
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [showLogEmailModal, setShowLogEmailModal] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [isLoggingEmail, setIsLoggingEmail] = useState(false);
  const ticketService = useMemo(() => new TicketService(), []);

  const { data: opportunity, error, mutate, isLoading } = useSWR(
    opportunityId ? `salesforce-opportunity-${opportunityId}` : null,
    async () => {
      try {
        const result = await salesforceService.getOpportunity(opportunityId as string, false);
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

  // Fetch available opportunity stages
  const { data: opportunityStages = [] } = useSWR(
    'opportunity-stages',
    async () => {
      try {
        const stages = await salesforceService.getOpportunityStages();
        return stages || [];
      } catch (err) {
        console.error('Error fetching opportunity stages:', err);
        return [
          'Prospecting',
          'Qualification',
          'Needs Analysis',
          'Value Proposition',
          'Id. Decision Makers',
          'Perception Analysis',
          'Proposal/Price Quote',
          'Negotiation/Review',
          'Closed Won',
          'Closed Lost',
        ];
      }
    },
    { revalidateOnFocus: false }
  );

  const handleEdit = useCallback(() => {
    router.push(`/crm/opportunities/${opportunityId}/edit`);
  }, [router, opportunityId]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await salesforceService.deleteOpportunity(opportunityId as string);
      showAlert({
        variant: 'success',
        title: 'Opportunity deleted successfully',
      });
      router.push(backUrl);
    } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to delete Opportunity',
        });
    } finally {
      setIsDeleting(false);
    }
  }, [salesforceService, opportunityId, router]);

  const handleCreateTicket = useCallback(() => {
    if (!opportunity) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ticket_opportunity_data', JSON.stringify(opportunity));
      sessionStorage.setItem('ticket_source_type', 'opportunity');
    }
    router.push(ROUTES.CRM.TICKETS.CREATE);
  }, [opportunity, router]);

  const handleScheduleMeeting = useCallback(async (meetingData: {
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
    if (!opportunity || !opportunityId) return;
    setIsSchedulingMeeting(true);
    try {
      await salesforceService.createEvent({
        subject: meetingData.subject,
        start_datetime: meetingData.start_datetime,
        end_datetime: meetingData.end_datetime,
        description: meetingData.description || '',
        what_id: opportunityId as string,
        location: meetingData.location || '',
        is_all_day: meetingData.is_all_day || false,
      });
      setShowMeetingModal(false);
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Meeting scheduled successfully',
      });
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to schedule meeting',
      });
    } finally {
      setIsSchedulingMeeting(false);
    }
  }, [opportunity, opportunityId, salesforceService]);

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
    if (!opportunity || !opportunityId) return;
    setIsLoggingCall(true);
    try {
      await salesforceService.createTask({
        ...callData,
        what_id: opportunityId as string,
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
  }, [opportunity, opportunityId, salesforceService, mutate]);

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
    if (!opportunity || !opportunityId) return;
    setIsLoggingEmail(true);
    try {
      await salesforceService.createEmailTask({
        ...emailData,
        what_id: opportunityId as string,
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
  }, [opportunity, opportunityId, salesforceService, mutate]);

  const isFinalStage = (stage: string) => {
    const stageLower = stage?.toLowerCase() || '';
    return stageLower.includes('closed won');
  };
  
  const isClosedLost = (stage: string) => {
    const stageLower = stage?.toLowerCase() || '';
    return stageLower.includes('closed lost');
  };

  const formatCurrency = (value: any) => {
    if (!value) return '--';
    const num = Number(value);
    if (isNaN(num)) return '--';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Fetch users for comments
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

  const handleStageChange = useCallback(async (newStage: string) => {
    if (!opportunity || newStage === opportunity.StageName) return;

    // If user clicks "Closed", show the selection modal
    if (newStage === 'Closed') {
      setShowClosedStageModal(true);
      return;
    }

    if (isClosedLost(newStage)) {
      setIsUpdatingStage(true);
      try {
        await salesforceService.updateOpportunityStage(opportunityId as string, newStage);
        await mutate();
        setChatterRefreshTrigger(prev => prev + 1);
        showAlert({
          variant: 'success',
          title: 'Opportunity stage updated to Closed Lost',
        });
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to update opportunity stage',
        });
      } finally {
        setIsUpdatingStage(false);
      }
      return;
    }

    if (isFinalStage(newStage)) {
      setPendingStage(newStage);
      setShowNavigationModal(true);
      return;
    }

    setIsUpdatingStage(true);
    try {
      await salesforceService.updateOpportunityStage(opportunityId as string, newStage);
      await mutate();
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: 'Opportunity stage updated successfully',
      });
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to update opportunity stage',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [opportunity, opportunityId, salesforceService, mutate]);

  const handleClosedStageSelect = useCallback(async (stage: 'Closed Won' | 'Closed Lost') => {
    setShowClosedStageModal(false);
    setIsUpdatingStage(true);
    try {
      await salesforceService.updateOpportunityStage(opportunityId as string, stage);
      await mutate();
      setChatterRefreshTrigger(prev => prev + 1);
      showAlert({
        variant: 'success',
        title: `Opportunity stage updated to ${stage}`,
      });
      // If Closed Won, show navigation modal
      if (stage === 'Closed Won') {
        setPendingStage(stage);
        setShowNavigationModal(true);
      }
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to update opportunity stage',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [opportunityId, salesforceService, mutate]);

  const handleNavigation = useCallback(async (action: 'create-campaign' | 'go-home' | 'stay') => {
    if (pendingStage) {
      setIsUpdatingStage(true);
      try {
        await salesforceService.updateOpportunityStage(opportunityId as string, pendingStage);
        await mutate();
        setChatterRefreshTrigger(prev => prev + 1);
        showAlert({
          variant: 'success',
          title: 'Opportunity stage updated successfully',
        });
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to update opportunity stage',
        });
        setShowNavigationModal(false);
        setIsUpdatingStage(false);
        return;
      } finally {
        setIsUpdatingStage(false);
      }
    }

    setShowNavigationModal(false);
    setPendingStage(null);

    switch (action) {
      case 'create-campaign':
        router.push('/campaigns/add-campaign');
        break;
      case 'go-home':
        router.push(ROUTES.DASHBOARD);
        break;
      case 'stay':
        break;
    }
  }, [pendingStage, opportunityId, salesforceService, mutate, router]);

  const opportunityName = useMemo(() => {
    return opportunity?.Name || 'Opportunity';
  }, [opportunity]);

  // Filter stages to replace "Closed Won" and "Closed Lost" with "Closed" for display
  const displayStages = useMemo(() => {
    if (!opportunityStages.length) return [];
    const filtered = opportunityStages.filter(
      (stage: string) => stage !== 'Closed Won' && stage !== 'Closed Lost'
    );
    // Add "Closed" at the end if there were closed stages
    if (opportunityStages.some((s: string) => s === 'Closed Won' || s === 'Closed Lost')) {
      filtered.push('Closed');
    }
    return filtered;
  }, [opportunityStages]);

  const currentStageIndex = useMemo(() => {
    if (!opportunity?.StageName || !displayStages.length) return -1;
    const stageName = opportunity.StageName;
    // If current stage is Closed Won or Closed Lost, map to "Closed" index
    if (stageName === 'Closed Won' || stageName === 'Closed Lost') {
      return displayStages.length - 1; // "Closed" is the last stage
    }
    return displayStages.indexOf(stageName);
  }, [opportunity?.StageName, displayStages]);

  return (
    <>
      <PageHeader
        showBackButton
        isLoading={isLoading}
        title={opportunityName}
        backUrl={backUrl}
        ActionComponent={() => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="small"
              label="Edit Opportunity"
              icon={<Edit size={16} />}
              iconPosition="right"
              onClick={handleEdit}
              disabled={isLoading || isDeleting}
            />
            <Button
              variant="tertiary"
              size="small"
              label="Delete Opportunity"
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
            {/* Overview Metrics Skeleton */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '24px' }}>
                <Skeleton width={120} height={28} variant="rectangular" />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '24px',
                  marginBottom: '24px',
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <Skeleton width={40} height={40} variant="rectangular" style={{ borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <Skeleton width={80} height={14} variant="text" style={{ marginBottom: '4px' }} />
                        <Skeleton width={100} height={20} variant="text" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Progression Bar Skeleton */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px' }}>
                <Skeleton width={200} height={24} variant="text" style={{ marginBottom: '8px' }} />
                <Skeleton width={300} height={16} variant="text" />
              </div>
              <Skeleton width="100%" height={48} variant="rectangular" style={{ borderRadius: '8px' }} />
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
        ) : opportunity ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Key Metrics Summary */}
            <div className={styles.detail_card} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Overview
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
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '24px',
                marginBottom: '24px'
              }}>
                {opportunity.Amount !== null && opportunity.Amount !== undefined && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: carterColors['brand-100'],
                    borderRadius: '8px',
                    border: `1px solid ${carterColors['blue-200']}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: carterColors['brand-600'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <Typography variant="caption-regular" color={carterColors['text-600']}>
                          Amount
                        </Typography>
                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                          {formatCurrency(opportunity.Amount)}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
                {opportunity.Probability !== null && opportunity.Probability !== undefined && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: carterColors['green-200'],
                    borderRadius: '8px',
                    border: `1px solid ${carterColors['green-200']}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: carterColors['green-700'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <Typography variant="caption-regular" color={carterColors['text-600']}>
                          Probability
                        </Typography>
                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                          {opportunity.Probability}%
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
                {opportunity.CloseDate && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: carterColors['grey-100'],
                    borderRadius: '8px',
                    border: `1px solid ${carterColors['grey-200']}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: carterColors['grey-600'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <Typography variant="caption-regular" color={carterColors['text-600']}>
                          Close Date
                        </Typography>
                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                          {formatDate(opportunity.CloseDate)}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
                {opportunity.StageName && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: isClosedLost(opportunity.StageName) 
                      ? carterColors['red-200'] 
                      : isFinalStage(opportunity.StageName)
                      ? carterColors['green-200']
                      : carterColors['grey-100'],
                    borderRadius: '8px',
                    border: `1px solid ${isClosedLost(opportunity.StageName) 
                      ? carterColors['red-200'] 
                      : isFinalStage(opportunity.StageName)
                      ? carterColors['green-200']
                      : carterColors['grey-200']}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: isClosedLost(opportunity.StageName) 
                          ? carterColors['red-700'] 
                          : isFinalStage(opportunity.StageName)
                          ? carterColors['green-700']
                          : carterColors['grey-600'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Target size={20} />
                      </div>
                      <div>
                        <Typography variant="caption-regular" color={carterColors['text-600']}>
                          Stage
                        </Typography>
                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                          {opportunity.StageName}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{
                  padding: '20px',
                  backgroundColor: carterColors['grey-100'],
                  borderRadius: '8px',
                  border: `1px solid ${carterColors['grey-200']}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: carterColors['grey-600'],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <Typography variant="caption-regular" color={carterColors['text-600']}>
                        Owner
                      </Typography>
                      <Typography variant="h3-semibold" color={carterColors['text-900']}>
                        {opportunity.Owner?.Name ?? opportunity.OwnerId ?? '--'}
                      </Typography>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Progression Bar */}
            {displayStages.length > 0 && opportunity.StageName && (
              <div className={styles.detail_card} style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Typography variant="h2-semibold" color={carterColors['text-900']}>
                      Stage Progression
                    </Typography>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-600']}>
                    Click on a stage to update the opportunity
                  </Typography>
                </div>
                
                <div className={styles.opportunity_progress}>
                  {(() => {
                    const lastCompletedIndex = currentStageIndex > 0 ? currentStageIndex - 1 : -1;
                    // Show last completed step (if exists) + next 3 steps at full width
                    const startIndex = lastCompletedIndex >= 0 ? lastCompletedIndex : currentStageIndex;
                    const fullWidthEndIndex = Math.min(displayStages.length, startIndex + 3);
                    
                    // Get the actual current stage name (Closed Won or Closed Lost if applicable)
                    const actualCurrentStage = opportunity.StageName;
                    const isCurrentlyClosedWon = actualCurrentStage === 'Closed Won';
                    const isCurrentlyClosedLost = actualCurrentStage === 'Closed Lost';
                    const isCurrentlyClosed = isCurrentlyClosedWon || isCurrentlyClosedLost;
                    
                    return displayStages.map((stage: string, index: number) => {
                      // Determine if this step should be collapsed or full width
                      // Show all steps, but collapse those outside the visible range
                      const isInFullWidthRange = index >= startIndex && index < fullWidthEndIndex;
                      const shouldCollapse = !isInFullWidthRange;
                      
                      const isCompleted = index < currentStageIndex;
                      const isActive = index === currentStageIndex;
                      const isFuture = index > currentStageIndex;
                      const isClickable = !isUpdatingStage && (isActive || isFuture || (isCompleted && index === currentStageIndex - 1));
                      
                      // For the "Closed" stage, show appropriate color based on actual stage
                      const isClosedStage = stage === 'Closed';
                      const shouldShowRed = isClosedStage && isActive && isCurrentlyClosedLost;
                      const shouldShowGreen = isClosedStage && isActive && isCurrentlyClosedWon;
                      
                      // Display the actual stage name if it's closed
                      const displayStageName = isClosedStage && isActive && isCurrentlyClosed 
                        ? actualCurrentStage 
                        : stage;
                    
                      // Collapse if it's completed or beyond the full width range
                      const shouldBeCollapsed = isCompleted || shouldCollapse;
                    
                    const segmentContent = (
                      <div
                        key={stage}
                        className={`${styles.progress_segment} ${
                          isCompleted ? styles.progress_segment_completed : ''
                        } ${isActive ? styles.progress_segment_active : ''} ${
                          isFuture ? styles.progress_segment_future : ''
                        } ${
                          isClickable ? styles.progress_segment_clickable : ''
                        } ${
                          shouldShowRed ? styles.progress_segment_closed_lost : ''
                        }`}
                        onClick={() => {
                          if (isClickable && stage !== opportunity.StageName && !(isClosedStage && isCurrentlyClosed)) {
                            handleStageChange(stage);
                          }
                        }}
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
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
                        title={!shouldBeCollapsed ? (isClickable ? `Click to change stage to ${stage}` : displayStageName) : undefined}
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
                                {displayStageName}
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
                            {isActive && !isCompleted && !shouldShowGreen && !shouldShowRed && (
                              <div style={{ 
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                border: `2px solid ${carterColors['brand-600']}`
                              }} />
                            )}
                            {isActive && shouldShowRed && (
                              <div style={{ 
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                border: `2px solid ${carterColors['red-700']}`
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
                          key={stage} 
                          title={isClickable ? `Click to change stage to ${stage}` : stage} 
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
            )}

            {/* Two Column Layout: Comments (Left) and Tabs (Right) */}
            {opportunity && opportunityId && (
              <div className={styles.two_column_wrapper}>
                <div className={styles.two_column_layout}>
                  {/* Left Column: Comments */}
                  <div className={styles.left_column_card}>
                    <CRMComments
                      objectType="opportunity"
                      objectId={opportunityId as string}
                      users={users}
                      onCommentAdded={() => {
                        // Optionally refresh opportunity data when comment is added
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
                            component: () => {
                              // Find the lead that was converted to this opportunity
                              const { data: allLeadsData } = useSWR(
                                opportunityId ? `all-leads-for-opportunity-details-${opportunityId}` : null,
                                () => salesforceService.getLeads(200, false),
                                { revalidateOnFocus: false }
                              );

                              const associatedLead = useMemo(() => {
                                if (!allLeadsData?.records || !opportunityId) return null;
                                return allLeadsData.records.find((lead: any) => 
                                  lead.ConvertedOpportunityId === opportunityId
                                );
                              }, [allLeadsData, opportunityId]);

                              return (
                                <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Opportunity Details */}
            <div className={styles.detail_card}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="h2-semibold" color={carterColors['text-900']}>
                  Opportunity Details
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
                  label="Opportunity Name"
                  value={opportunity.Name || '--'}
                />
                {opportunity.Type && (
                  <FieldItem
                    label="Type"
                    value={opportunity.Type}
                  />
                )}
                {opportunity.LeadSource && (
                  <FieldItem
                    label="Lead Source"
                    value={opportunity.LeadSource}
                  />
                )}
                {opportunity.Description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FieldItem
                      label="Description"
                      value={opportunity.Description}
                    />
                  </div>
                )}
                <FieldItem
                  label="Owner"
                  value={opportunity.Owner?.Name ?? opportunity.OwnerId ?? '--'}
                />
              </div>
            </div>

            {/* Related Information */}
            {(opportunity.Account?.Name || opportunity.Contact?.Name || associatedLead) && (
              <div className={styles.detail_card}>
                <div style={{ marginBottom: '20px' }}>
                  <Typography variant="h2-semibold" color={carterColors['text-900']}>
                    Related Information
                  </Typography>
                </div>
                <div className={styles.detail_grid}>
                  {opportunity.Account?.Name && (
                    <FieldItem
                      label="Account"
                      value={opportunity.Account.Name}
                    />
                  )}
                  {opportunity.Contact?.Name && (
                    <FieldItem
                      label="Contact"
                      value={opportunity.Contact.Name}
                    />
                  )}
                  {associatedLead && (
                      <FieldItem
                      label="Converted Lead"
                        value={
                        <a
                          href={`/app/crm/leads/${associatedLead.Id}`}
                          style={{
                            color: carterColors['brand-600'],
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {associatedLead.FirstName && associatedLead.LastName
                            ? `${associatedLead.FirstName} ${associatedLead.LastName}`
                            : associatedLead.Company || associatedLead.Email || 'Lead'}
                        </a>
                      }
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
              <div className={styles.detail_grid}>
                {opportunity.CreatedDate && (
                  <FieldItem
                    label="Created Date"
                    value={formatDate(opportunity.CreatedDate)}
                  />
                )}
                {opportunity.LastModifiedDate && (
                  <FieldItem
                    label="Last Modified"
                    value={formatDate(opportunity.LastModifiedDate)}
                  />
                )}
                {opportunity.Id && (
                  <FieldItem
                    label={isFromCarter ? 'Carter ID' : 'Salesforce ID'}
                    value={
                      <span style={{ fontFamily: 'monospace' }}>{opportunity.Id}</span>
                    }
                  />
                )}
              </div>
            </div>
                                </div>
                              );
                            },
                          },
                          {
                            title: 'Activity',
                            component: () => {
                              // Find the lead that was converted to this opportunity
                              const { data: allLeadsData } = useSWR(
                                opportunityId ? `all-leads-for-opportunity-${opportunityId}` : null,
                                () => salesforceService.getLeads(200, false),
                                { revalidateOnFocus: false }
                              );

                              const associatedLead = useMemo(() => {
                                if (!allLeadsData?.records || !opportunityId) return null;
                                return allLeadsData.records.find((lead: any) => 
                                  lead.ConvertedOpportunityId === opportunityId
                                );
                              }, [allLeadsData, opportunityId]);

                              // Fetch opportunity meetings
                              const { data: eventsData, isLoading: isLoadingEvents } = useSWR(
                                opportunityId ? [`crm-events-${opportunityId}`, opportunityId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordEvents(opportunityId as string, 50),
                                { revalidateOnFocus: false }
                              );

                              // Fetch opportunity tickets
                              const { data: ticketsData, isLoading: isLoadingTickets } = useSWR(
                                opportunityId ? [`tickets-by-source-opportunity-${opportunityId}`, 'opportunity', opportunityId] : null,
                                () => ticketService.getTicketsBySource('opportunity', opportunityId as string),
                                { revalidateOnFocus: false }
                              );

                              // Fetch opportunity tasks (calls)
                              const { data: opportunityTasksData, isLoading: isLoadingOpportunityTasks } = useSWR(
                                opportunityId ? [`crm-tasks-opportunity-${opportunityId}`, opportunityId, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordTasks(opportunityId as string, 50),
                                { revalidateOnFocus: false }
                              );

                              // Fetch lead meetings if lead exists
                              const { data: leadEventsData, isLoading: isLoadingLeadEvents } = useSWR(
                                associatedLead?.Id ? [`crm-events-lead-${associatedLead.Id}`, associatedLead.Id, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordEvents(associatedLead.Id, 50),
                                { revalidateOnFocus: false }
                              );

                              // Fetch lead tickets if lead exists
                              const { data: leadTicketsData, isLoading: isLoadingLeadTickets } = useSWR(
                                associatedLead?.Id ? [`tickets-by-source-lead-${associatedLead.Id}`, 'lead', associatedLead.Id] : null,
                                () => ticketService.getTicketsBySource('lead', associatedLead.Id),
                                { revalidateOnFocus: false }
                              );

                              // Fetch lead tasks (calls) if lead exists
                              const { data: leadTasksData, isLoading: isLoadingLeadTasks } = useSWR(
                                associatedLead?.Id ? [`crm-tasks-lead-${associatedLead.Id}`, associatedLead.Id, chatterRefreshTrigger] : null,
                                () => salesforceService.getRecordTasks(associatedLead.Id, 50),
                                { revalidateOnFocus: false }
                              );

                              const isLoadingActivities = isLoadingEvents || isLoadingTickets || isLoadingOpportunityTasks || 
                                                         isLoadingLeadEvents || isLoadingLeadTickets || isLoadingLeadTasks;

                              const events = [...(eventsData?.records || []), ...(leadEventsData?.records || [])];
                              const tickets = [...(ticketsData?.tickets || []), ...(leadTicketsData?.tickets || [])];
                              const tasks = [...(opportunityTasksData?.records || []), ...(leadTasksData?.records || [])];

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
                                    // For emails, show a cleaner description
                                    const toMatch = task.Description.match(/To:\s*([^\n]+)/);
                                    const fromMatch = task.Description.match(/From:\s*([^\n]+)/);
                                    const emailBody = task.Description.split('\n\n').slice(1).join('\n\n').trim();
                                    
                                    if (toMatch || fromMatch || emailBody) {
                                      const parts: string[] = [];
                                      if (toMatch) parts.push(`To: ${toMatch[1].trim()}`);
                                      if (fromMatch) parts.push(`From: ${fromMatch[1].trim()}`);
                                      if (emailBody) parts.push(emailBody);
                                      displayDescription = parts.join('\n');
                                    }
                                  }
                                  
                                  activities.push({
                                    id: task.Id,
                                    type: isEmail ? 'email' : 'call',
                                    title: displayTitle,
                                    description: displayDescription + durationText,
                                    date: callDate,
                                    dateDisplay: dateDisplay,
                                    icon: isEmail ? (
                                      <Mail size={16} style={{ color: carterColors['light-blue'] }} />
                                    ) : (
                                      <Phone size={16} style={{ color: '#FFFFFF' }} />
                                    ),
                                    color: isEmail ? 'transparent' : carterColors['brand-600'],
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
                                <div className={styles.tab_content} style={{ display: 'flex', flexDirection: 'column'}}>
                                  {/* Action Buttons */}
                                  <div className={styles.action_buttons_container}>
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Log a Call"
                                      icon={<Phone size={14} />}
                                      onClick={() => setShowLogCallModal(true)}
                                      disabled={isLoading || !opportunity}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Send Email"
                                      icon={<Mail size={14} />}
                                      onClick={() => setShowLogEmailModal(true)}
                                      disabled={isLoading || !opportunity}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Meeting"
                                      icon={<Calendar size={14} />}
                                      onClick={() => setShowMeetingModal(true)}
                                      disabled={isLoading || !opportunity}
                                    />
                                    <Button
                                      variant="text-only"
                                      size="small"
                                      label="Create Ticket"
                                      icon={<Ticket size={14} />}
                                      onClick={handleCreateTicket}
                                      disabled={isLoading || !opportunity}
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
                                          marginTop: '24px',
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
                                                <div style={{ marginBottom: '8px' }}>
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
                                        }}
                                      >
                                        <ChevronDown size={16} />
                                        <Typography variant="h3-semibold" color={carterColors['text-900']}>
                                          Past Activities
                                        </Typography>
                                      </div>
                                      {(
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
                  recordId={opportunityId as string}
                  refreshTrigger={chatterRefreshTrigger}
                                    onRefresh={() => {
                                      // Optionally refresh opportunity data when feed is refreshed
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
              Failed to load opportunity details. Please try again.
            </Typography>
          </div>
        ) : null}
      </div>

      {/* Opportunity Navigation Modal */}
      <OpportunityNavigationModal
        open={showNavigationModal}
        onClose={() => {
          setShowNavigationModal(false);
          setPendingStage(null);
        }}
        onNavigate={handleNavigation}
        stageName={pendingStage || opportunity?.StageName || ''}
      />

      {/* Closed Stage Selection Modal */}
      <ClosedStageSelectionModal
        open={showClosedStageModal}
        onClose={() => setShowClosedStageModal(false)}
        onSelect={handleClosedStageSelect}
        isLoading={isUpdatingStage}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Opportunity"
        message="Are you sure you want to delete this Opportunity? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Meeting Modal */}
      <LeadMeetingModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSchedule={handleScheduleMeeting}
        lead={null}
        isLoading={isSchedulingMeeting}
      />

      {/* Log Call Modal */}
      <LogCallModal
        open={showLogCallModal}
        onClose={() => setShowLogCallModal(false)}
        onLogCall={handleLogCall}
        opportunity={opportunity}
        isLoading={isLoggingCall}
      />

      <LogEmailModal
        open={showLogEmailModal}
        onClose={() => setShowLogEmailModal(false)}
        onLogEmail={handleLogEmail}
        opportunity={opportunity}
        isLoading={isLoggingEmail}
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
                          {`${Math.floor(selectedTaskData.CallDurationInSeconds / 60)} min ${selectedTaskData.CallDurationInSeconds % 60} sec`}
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
                      <div style={{ minWidth: '100px' }}>
                        <Typography variant="body-regular" color={carterColors['text-600']}>
                          ID:
                        </Typography>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        <Typography variant="body-regular" color={carterColors['text-900']}>
                          {selectedTaskData.Id}
                        </Typography>
                      </div>
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
        onTicketUpdated={() => {}}
        onTicketDeleted={() => {
          setSelectedTicketId(null);
        }}
      />
    </>
  );
};

OpportunityDetailPage.getLayout = page => {
  return <InternalLayout head={{ title: 'Opportunity Details' }}>{page}</InternalLayout>;
};

export default OpportunityDetailPage;
