import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  carterColors,
} from 'shyftlabs-dsl';
import {
  RefreshCw,
  LogOut,
  BarChart3,
  Users,
  UserCheck,
  Briefcase,
  Building2,
  AlertCircle,
  Bell,
} from 'lucide-react';
import useSWR from 'swr';
import { useSelector } from 'react-redux';
import { Skeleton } from '@/lib/material-ui';
import SalesforceService, { SalesforceDashboardData } from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import { IRootState } from '@/redux/reducers';
import ROUTES from '@/common/routes';
import useDataTableVisibilityHelper from '@/common/data-table.helper';
import useConfigs from '@/contexts/app-configs/app-configs.hooks';
import NotificationService, { Notification } from '@/services/notifications/notification.service';
import useAccount from '@/contexts/account/account-data.hook';
import DateService from '@/services/date-service/date.service';
import { DateTimeType } from '@/lib/date-time-parser';
import {
  getLeadColumns,
  getContactColumns,
  getOpportunityColumns,
  getAccountColumns,
} from '../helpers/salesforce-columns.helper';
import styles from '../styles/crm.module.scss';

// Import extracted components
import {
  SalesforceDashboard,
  SalesforceLeadCards,
  SalesforceContactCards,
  SalesforceOpportunityCards,
  SalesforceAccountCards,
  SalesforceNotifications,
  SalesforceHeaderControls,
  DATE_FILTER_ENUM,
  TabType,
  ViewMode,
} from './salesforce-data-view';

interface SalesforceDataViewProps {
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const SalesforceDataView: React.FC<SalesforceDataViewProps> = ({ onHeaderActionsReady }) => {
  const router = useRouter();
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Get initial tab from query parameter, default to 'dashboard'
  const getInitialTab = (): TabType => {
    const tabParam = router.query.tab as string;
    const validTabs = ['dashboard', 'leads', 'contacts', 'opportunities', 'accounts', 'notifications'];
    return validTabs.includes(tabParam) ? tabParam as TabType : 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  
  // Update active tab when query parameter changes
  useEffect(() => {
    const tabParam = router.query.tab as string;
    const validTabs = ['dashboard', 'leads', 'contacts', 'opportunities', 'accounts', 'notifications'];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [router.query.tab]);

  // Reset all filters when changing tabs
  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    setSearchTerm('');
    setSelectedLeadStatus('all');
    setSelectedOpportunityStatus('all');
    setSelectedOwner('all');
    setViewMode('card');
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>('all');
  const [selectedOpportunityStatus, setSelectedOpportunityStatus] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const { enableColumnHiding } = useConfigs();
  const { columnVisibility, handleColumnVisibilityChange } = useDataTableVisibilityHelper();
  const { timeZone, account } = useAccount();
  const dateService = useMemo(() => new DateService(), []);
  
  // Date range state for Quarterly Performance graph
  const [dateFilter, setDateFilter] = useState<DATE_FILTER_ENUM>(DATE_FILTER_ENUM.LAST_30_DAYS);
  const [dateRange, setDateRange] = useState<{
    startDate: DateTimeType | null;
    endDate: DateTimeType | null;
  }>(() => {
    // Initialize with Last 30 Days
    const service = new DateService();
    const range = service.getDateRange('last_30_days', timeZone);
    return {
      startDate: range.startDate,
      endDate: range.endDate,
    };
  });
  
  // Handle date filter change
  const handleDateFilterChange = useCallback((filter: string) => {
    if (filter === DATE_FILTER_ENUM.CUSTOM) {
      setDateFilter(DATE_FILTER_ENUM.CUSTOM);
      return;
    }
    if (filter === DATE_FILTER_ENUM.LAST_30_DAYS) {
      const range = dateService.getDateRange('last_30_days', timeZone);
      setDateRange({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      setDateFilter(DATE_FILTER_ENUM.LAST_30_DAYS);
      return;
    }
    if (filter === DATE_FILTER_ENUM.LAST_90_DAYS) {
      const range = dateService.getDateRange('last_90_days', timeZone);
      setDateRange({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      setDateFilter(DATE_FILTER_ENUM.LAST_90_DAYS);
    }
  }, [dateService, timeZone]);

  // Goal value state (user-entered)
  const [goalValue, setGoalValue] = useState<number | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState<string>('');
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  // Reset status filters when switching tabs
  useEffect(() => {
    if (activeTab !== 'leads') {
      setSelectedLeadStatus('all');
    }
    if (activeTab !== 'opportunities') {
      setSelectedOpportunityStatus('all');
    }
    setSelectedOwner('all');
  }, [activeTab]);

  // Get user_account_id from Redux user - use id (matches what's used in mentioned_user_account_ids)
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const userAccountId = reduxUser?.id || reduxUser?.accountId || reduxUser?.email || '';
  
  // Fetch user UUID from /users/me API for notification operations
  // Pass account_id (e.g., "877") to get the user's UUID (id column)
  const { data: currentUserData } = useSWR(
    userAccountId ? ['crm-current-user', userAccountId] : null,
    async () => {
      try {
        // Pass account_id to get user's UUID from the backend
        const user = await salesforceService.getCurrentUser(userAccountId);
        return user;
      } catch (error) {
        console.error('[SalesforceDataView] Error fetching current user:', error);
        return null;
      }
    },
    {
      revalidateOnFocus: false,
    }
  );
  
  // Use UUID (id column) from /users/me API if available, otherwise fallback to userAccountId
  const userUuidForNotifications = currentUserData?.id ? String(currentUserData.id) : userAccountId;

  // Fetch dashboard data
  const { data: dashboardData, error, mutate, isLoading } = useSWR<SalesforceDashboardData>(
    'salesforce-dashboard',
    async () => {
      return await salesforceService.getDashboard(200, false);
    },
    {
      revalidateOnFocus: false,
      onError: (err: any) => {
        if (err?.status === 401 || err?.status === 404) {
          showAlert({
            variant: 'warning',
            title: 'Connection Lost: Your Salesforce connection has expired. Please reconnect.',
          });
          router.push(ROUTES.CRM.SALESFORCE.CONNECT);
        }
      },
    }
  );

  // Notifications logic - fetch when notifications tab is active
  const notificationService = useMemo(() => new NotificationService(), []);
  
  // Notification state
  const [notificationsData, setNotificationsData] = useState<{ notifications: Notification[]; unread_count: number } | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [unreadCountData, setUnreadCountData] = useState<number>(0);

  // Fetch notifications when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications' && userAccountId) {
      setIsLoadingNotifications(true);
      Promise.all([
        notificationService.getNotifications(50, 0, false, userAccountId),
        notificationService.getUnreadCount(userAccountId)
      ])
        .then(([notifications, unreadCount]) => {
          setNotificationsData(notifications);
          setUnreadCountData(unreadCount);
          setIsLoadingNotifications(false);
        })
        .catch((error) => {
          console.error('[SalesforceDataView] Error fetching notifications:', error);
          setIsLoadingNotifications(false);
        });
    }
  }, [activeTab, userAccountId, notificationService]);

  // Fetch unread count when dashboard is loaded (for tab indicator)
  useEffect(() => {
    if (dashboardData && userAccountId && activeTab !== 'notifications') {
      notificationService.getUnreadCount(userAccountId)
        .then((count) => {
          setUnreadCountData(count);
        })
        .catch((error) => {
          console.error('[SalesforceDataView] Error fetching unread count:', error);
          // Silently fail - notifications are optional
        });
    }
  }, [dashboardData, userAccountId, activeTab, notificationService]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      await salesforceService.disconnect();
      showAlert({
        variant: 'success',
        title: 'Successfully disconnected from Salesforce',
      });
      router.push(ROUTES.CRM.BASE);
    } catch (err: any) {
      showAlert({
        variant: 'error' as any,
        title: err?.message || 'Failed to disconnect',
      });
    } finally {
      setIsDisconnecting(false);
    }
  }, [salesforceService, router]);

  // Create header actions component (only Refresh and Disconnect, Back to CRM is handled by PageHeader)
  const headerActions = useMemo(() => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Button
        variant="secondary"
        size="small"
        icon={<RefreshCw size={16} />}
        iconPosition="left"
        label="Refresh"
        onClick={async () => {
          await mutate(salesforceService.getDashboard(200, true), { revalidate: false });
        }}
        disabled={isLoading}
      />
      <Button
        variant="tertiary"
        size="small"
        icon={<LogOut size={16} />}
        iconPosition="left"
        label="Disconnect"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      />
    </div>
  ), [mutate, salesforceService, isLoading, handleDisconnect, isDisconnecting]);

  // Notify parent component about header actions
  useEffect(() => {
    if (onHeaderActionsReady) {
      onHeaderActionsReady(headerActions);
    }
  }, [onHeaderActionsReady, headerActions]);

  // Get unique statuses for filter buttons (Leads)
  const uniqueStatuses = useMemo(() => {
    if (!dashboardData?.leads?.records || activeTab !== 'leads') return [];
    const statusSet = new Set<string>();
    dashboardData.leads.records.forEach((lead: any) => {
      if (lead.Status) {
        statusSet.add(lead.Status);
      }
    });
    return Array.from(statusSet).sort();
  }, [dashboardData, activeTab]);

  // Get unique stages for filter buttons (Opportunities)
  const uniqueOpportunityStages = useMemo(() => {
    if (!dashboardData?.opportunities?.records || activeTab !== 'opportunities') return [];
    const stageSet = new Set<string>();
    dashboardData.opportunities.records.forEach((opp: any) => {
      if (opp.StageName) {
        stageSet.add(opp.StageName);
      }
    });
    return Array.from(stageSet).sort();
  }, [dashboardData, activeTab]);

  // Get unique owners for filter (Leads, Contacts, Opportunities)
  const uniqueOwners = useMemo(() => {
    if (activeTab === 'leads' && dashboardData?.leads?.records) {
      const set = new Set<string>();
      dashboardData.leads.records.forEach((r: any) => {
        const name = r.Owner?.Name || (r as any).OwnerName;
        if (name) set.add(name);
      });
      return Array.from(set).sort();
    }
    if (activeTab === 'contacts' && dashboardData?.contacts?.records) {
      const set = new Set<string>();
      dashboardData.contacts.records.forEach((r: any) => {
        const name = r.Owner?.Name || (r as any).OwnerName;
        if (name) set.add(name);
      });
      return Array.from(set).sort();
    }
    if (activeTab === 'opportunities' && dashboardData?.opportunities?.records) {
      const set = new Set<string>();
      dashboardData.opportunities.records.forEach((r: any) => {
        const name = r.Owner?.Name || (r as any).OwnerName;
        if (name) set.add(name);
      });
      return Array.from(set).sort();
    }
    return [];
  }, [dashboardData, activeTab]);

  // Calculate quarterly performance metrics (monthly data for selected date range)
  const calculateQuarterlyPerformance = useMemo(() => {
    if (!dashboardData?.opportunities?.records || !dateRange.startDate || !dateRange.endDate) {
      return null;
    }

    const opportunities = dashboardData.opportunities.records;
    
    // Use selected date range
    const rangeStart = dateRange.startDate.toDate();
    const rangeEnd = dateRange.endDate.toDate();
    
    // Calculate days difference
    const daysDiff = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // If range is <= 90 days, show date-wise data; otherwise show monthly
    const useDailyData = daysDiff <= 90;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let timePeriods: Array<{ label: string; start: Date; end: Date }> = [];
    
    if (useDailyData) {
      // Generate daily data points
      let currentDate = new Date(rangeStart);
      while (currentDate <= rangeEnd) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const month = monthNames[currentDate.getMonth()];
        const day = currentDate.getDate();
        const label = `${month} ${day}`;
        
        timePeriods.push({ label, start: dayStart, end: dayEnd });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Generate monthly data points
      let currentDate = new Date(rangeStart);
      while (currentDate <= rangeEnd) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        
        // Check if this month is already added
        const exists = timePeriods.some(t => 
          t.start.getFullYear() === year && t.start.getMonth() === month
        );
        if (!exists) {
          const label = `${monthNames[month]} ${year}`;
          timePeriods.push({ label, start: monthStart, end: monthEnd });
        }
        
        // Move to next month
        currentDate = new Date(year, month + 1, 1);
      }
    }
    
    // Sort chronologically
    timePeriods.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Get all currently open opportunities with >70% probability (not filtered by date)
    const allOpenHighProbOpps = opportunities.filter((opp: any) => {
      const stage = (opp.StageName || '').toLowerCase();
      const isClosed = stage.includes('closed');
      const probability = parseFloat(opp.Probability || 0);
      // High probability stages or explicit probability > 70%
      return !isClosed && (probability > 70 || 
        stage.includes('proposal') || 
        stage.includes('negotiation') ||
        stage.includes('decision'));
    });
    
    const totalOpenHighProb = allOpenHighProbOpps.reduce((sum: number, opp: any) => {
      return sum + (parseFloat(opp.Amount || 0) || 0);
    }, 0);
    
    // Calculate data for selected date range (daily or monthly)
    const monthlyData = timePeriods.map(({ label, start, end }) => {
      // Filter opportunities that CLOSED (won) within this period
      const closedOpps = opportunities.filter((opp: any) => {
        if (!opp.CloseDate) return false;
        const stage = (opp.StageName || '').toLowerCase();
        const isWon = stage.includes('closed won') || stage === 'closed won';
        if (!isWon) return false;
        
        const closeDate = new Date(opp.CloseDate);
        return closeDate >= start && closeDate <= end;
      });
      
      const closedValue = closedOpps.reduce((sum: number, opp: any) => {
        return sum + (parseFloat(opp.Amount || 0) || 0);
      }, 0);
      
      // For "Closed + Open (>70%)", we add closed value for this month + current open high prob value
      // This represents the pipeline value at that point in time
      const closedPlusOpen = closedValue + totalOpenHighProb;
      
      return {
        month: label,
        closed: closedValue,
        openHighProb: totalOpenHighProb, // Current open high prob value (same for all periods)
        closedPlusOpen: closedPlusOpen,
        goal: 0, // Will be set after calculating goal
      };
    });

    // Calculate total CLOSED for the selected date range (sum of all months)
    const totalClosed = monthlyData.reduce((sum, month) => sum + month.closed, 0);
    
    // Use user-entered goal value (or 0 if not set)
    const userGoalValue = goalValue || 0;

    // Add goal value to each data point for the goal line
    const monthlyDataWithGoal = monthlyData.map(d => ({
      ...d,
      goal: userGoalValue,
    }));

    return {
      monthlyData: monthlyDataWithGoal,
      totalClosed,
      totalOpenHighProb,
      goalValue: userGoalValue,
    };
  }, [dashboardData, dateRange, goalValue]);

  const handleCreateTicket = useCallback((data: any, sourceType: 'lead' | 'contact' | 'opportunity' | 'account' = 'lead') => {
    // Store data in sessionStorage and navigate to ticket creation page
    if (typeof window !== 'undefined') {
      if (sourceType === 'lead') {
        sessionStorage.setItem('ticket_lead_data', JSON.stringify(data));
        sessionStorage.setItem('ticket_source_type', 'lead');
      } else if (sourceType === 'contact') {
        sessionStorage.setItem('ticket_contact_data', JSON.stringify(data));
        sessionStorage.setItem('ticket_source_type', 'contact');
      } else if (sourceType === 'account') {
        sessionStorage.setItem('ticket_account_data', JSON.stringify(data));
        sessionStorage.setItem('ticket_source_type', 'account');
      } else {
        sessionStorage.setItem('ticket_opportunity_data', JSON.stringify(data));
        sessionStorage.setItem('ticket_source_type', 'opportunity');
      }
    }
    router.push(ROUTES.CRM.TICKETS.CREATE);
  }, [router]);

  // Handle name click navigation
  const handleNameClick = useCallback((record: any) => {
    if (!record?.Id) {
      console.error('handleNameClick: No Id found in record', record);
      return;
    }
    
    let path = '';
    switch (activeTab) {
      case 'leads':
        path = `/crm/leads/${record.Id}`;
        break;
      case 'contacts':
        path = `/crm/contacts/${record.Id}`;
        break;
      case 'opportunities':
        path = `/crm/opportunities/${record.Id}`;
        break;
      default:
        console.error('handleNameClick: Unknown activeTab', activeTab);
        return;
    }
    
    if (path) {
      router.push(path);
    }
  }, [activeTab, router]);


  // Get data based on active tab
  const getData = useMemo(() => {
    if (!dashboardData) return [];
    
    let records: any[] = [];
    switch (activeTab) {
      case 'leads':
        records = dashboardData.leads?.records || [];
        break;
      case 'contacts':
        records = dashboardData.contacts?.records || [];
        break;
      case 'opportunities':
        records = dashboardData.opportunities?.records || [];
        break;
      case 'accounts':
        records = dashboardData.accounts?.records || [];
        break;
      default:
        return [];
    }

    // Filter by search term if provided
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      records = records.filter(record => {
        return Object.values(record).some(value => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'object') {
            return JSON.stringify(value).toLowerCase().includes(lowerSearch);
          }
          return String(value).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // Filter by lead status if on leads tab
    if (activeTab === 'leads' && selectedLeadStatus !== 'all') {
      records = records.filter((lead: any) => {
        const leadStatus = lead.Status?.toLowerCase() || '';
        const selectedStatusLower = selectedLeadStatus.toLowerCase();
        return leadStatus === selectedStatusLower || leadStatus.includes(selectedStatusLower);
      });
    }

    // Filter by opportunity stage if on opportunities tab
    if (activeTab === 'opportunities' && selectedOpportunityStatus !== 'all') {
      records = records.filter((opp: any) => {
        const oppStage = opp.StageName?.toLowerCase() || '';
        const selectedStageLower = selectedOpportunityStatus.toLowerCase();
        return oppStage === selectedStageLower || oppStage.includes(selectedStageLower);
      });
    }

    // Filter by owner if on leads, contacts, or opportunities tab
    if (selectedOwner !== 'all' && (activeTab === 'leads' || activeTab === 'contacts' || activeTab === 'opportunities')) {
      records = records.filter((r: any) => {
        const ownerName = r.Owner?.Name || (r as any).OwnerName;
        return ownerName === selectedOwner;
      });
    }

    return records;
  }, [dashboardData, activeTab, searchTerm, selectedLeadStatus, selectedOpportunityStatus, selectedOwner]);


  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count ?? unreadCountData ?? 0;

  // Helper to refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!userAccountId) return;
    try {
      const [notifications, unreadCount] = await Promise.all([
        notificationService.getNotifications(50, 0, false, userAccountId),
        notificationService.getUnreadCount(userAccountId)
      ]);
      setNotificationsData(notifications);
      setUnreadCountData(unreadCount);
    } catch {
      // Silently fail
    }
  }, [userAccountId, notificationService]);
  
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      setMarkingAsRead(notificationId);
      try {
        if (!userUuidForNotifications) {
          throw new Error('User ID not available. Please refresh the page.');
        }
        await notificationService.markAsRead(notificationId, userUuidForNotifications);
        await refreshNotifications();
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to mark notification as read',
        });
      } finally {
        setMarkingAsRead(null);
      }
    },
    [notificationService, refreshNotifications, userUuidForNotifications]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      if (!userUuidForNotifications) {
        throw new Error('User ID not available. Please refresh the page.');
      }
      await notificationService.markAllAsRead(userUuidForNotifications);
      await refreshNotifications();
      showAlert({
        variant: 'success',
        title: 'All notifications marked as read',
      });
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to mark all as read',
      });
    }
  }, [notificationService, refreshNotifications, userUuidForNotifications]);

  const handleDelete = useCallback(
    async (notificationId: string) => {
      try {
        if (!userUuidForNotifications) {
          throw new Error('User ID not available. Please refresh the page.');
        }
        await notificationService.deleteNotification(notificationId, userUuidForNotifications);
        await refreshNotifications();
      } catch (err: any) {
        showAlert({
          variant: 'warning',
          title: err?.message || 'Failed to delete notification',
        });
      }
    },
    [notificationService, refreshNotifications, userUuidForNotifications]
  );

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }

      // Navigate to the related entity
      if (notification.related_entity) {
        const { object_type, object_id, comment_type } = notification.related_entity;

        if (comment_type === 'crm') {
          // Navigate to CRM object detail page (Lead, Contact, or Opportunity)
          if (object_type === 'lead') {
            router.push(`/crm/leads/${object_id}`);
          } else if (object_type === 'contact') {
            router.push(`/crm/contacts/${object_id}`);
          } else if (object_type === 'opportunity') {
            router.push(`/crm/opportunities/${object_id}`);
          }
        } else if (comment_type === 'ticket') {
          // For tickets, navigate to tickets kanban page with ticket ID to open the drawer
          // The ticket ID should be in object_id when it's a ticket notification
          if (object_id) {
            router.push(`${ROUTES.CRM.TICKETS.KANBAN}?ticketId=${object_id}`);
          } else {
            // Fallback to tickets page if no ticket ID
            router.push(ROUTES.CRM.TICKETS.KANBAN);
          }
        }
      }
    },
    [router, handleMarkAsRead]
  );

  return (
    <div className={styles.data_view_container}>
      <div className={styles.data_view_content}>
        <div className={styles.tabs}>
          {([
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'leads', label: 'Leads', icon: Users },
            { key: 'opportunities', label: 'Opportunity', icon: Briefcase },
            { key: 'contacts', label: 'Contacts', icon: UserCheck },
            { key: 'accounts', label: 'Account', icon: Building2 },
            { key: 'notifications', label: 'Notifications', icon: Bell },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`${styles.tab} ${activeTab === key ? styles.tab_active : ''}`}
              onClick={() => {
                handleTabChange(key);
                // Update URL without navigation to reflect active tab
                router.replace(`${ROUTES.CRM.SALESFORCE.DATA}?tab=${key}`, undefined, { shallow: true });
              }}
              style={{ position: 'relative' }}
            >
              <Icon size={18} style={{ marginRight: '8px' }} />
              <Typography
                variant="body-semibold"
                color={activeTab === key ? carterColors['brand-600'] : carterColors['text-600']}
              >
                {label}
              </Typography>
              {key === 'notifications' && unreadCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: carterColors['red-700'],
                    border: `2px solid ${activeTab === key ? carterColors['brand-100'] : 'white'}`,
                  }}
                  title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
                />
              )}
            </button>
          ))}
        </div>

        {isLoading && activeTab === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Stat Cards Skeleton */}
            <div className={styles.dashboard_grid}>
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className={styles.stat_card} style={{ padding: '24px' }}>
                  <div className={styles.stat_icon} style={{ marginBottom: '4px' }}>
                    <Skeleton width={20} height={20} variant="circular" />
                  </div>
                  <Skeleton width={80} height={32} variant="text" style={{ marginBottom: '8px' }} />
                  <Skeleton width={100} height={20} variant="text" />
                </div>
              ))}
            </div>

            {/* Quarterly Performance Section Skeleton */}
            <div style={{
              padding: '24px',
              border: `1px solid ${carterColors['grey-200']}`,
              borderRadius: '8px',
              backgroundColor: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <Skeleton width={200} height={28} variant="text" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Skeleton width={80} height={32} variant="rectangular" style={{ borderRadius: '4px' }} />
                  <Skeleton width={100} height={32} variant="rectangular" style={{ borderRadius: '4px' }} />
                  <Skeleton width={100} height={32} variant="rectangular" style={{ borderRadius: '4px' }} />
                </div>
              </div>
              <Skeleton width="100%" height={300} variant="rectangular" style={{ borderRadius: '4px' }} />
            </div>
          </div>
        ) : isLoading ? (
          <div className={styles.opportunities_wrapper}>
            <div className={styles.opportunities_grid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={styles.opportunity_card}>
                  {/* Card Header Skeleton */}
                  <div className={styles.opportunity_card_header}>
                    <div className={styles.opportunity_title_section}>
                      <Skeleton width={50} height={34} variant="rectangular" style={{ borderRadius: '4px' }} />
                    </div>
                    <Skeleton width={100} height={20} variant="rectangular" style={{ borderRadius: '4px' }} />
                  </div>
                  
                  {/* Card Body Skeleton */}
                  <div className={styles.opportunity_card_body}>
                    <div className={styles.opportunity_field}>
                      <Skeleton width={60} height={14} variant="text" />
                      <Skeleton width="80%" height={20} variant="text" />
                    </div>
                    <div className={styles.opportunity_field}>
                      <Skeleton width={60} height={14} variant="text" />
                      <Skeleton width="90%" height={20} variant="text" />
                    </div>
                    <div className={styles.opportunity_field}>
                      <Skeleton width={60} height={14} variant="text" />
                      <Skeleton width="70%" height={20} variant="text" />
                    </div>
                    <div className={styles.opportunity_field}>
                      <Skeleton width={60} height={14} variant="text" />
                      <Skeleton width="85%" height={20} variant="text" />
                    </div>
                    <div className={styles.opportunity_field} style={{ gridColumn: '1 / -1' }}>
                      <Skeleton width={60} height={14} variant="text" style={{ marginBottom: '8px' }} />
                      <Skeleton width="100%" height={48} variant="rectangular" style={{ borderRadius: '8px' }} />
                    </div>
                  </div>
                  
                  {/* Footer Skeleton */}
                  <div className={styles.opportunity_card_footer}>
                    <Skeleton width={80} height={16} variant="text" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className={styles.error_state}>
            <AlertCircle size={20} color={carterColors['red-700']} />
            <Typography variant="body-regular" color={carterColors['red-700']}>
              {error?.message || 'Failed to load data'}
            </Typography>
          </div>
        ) : (
          <div className={styles.tab_content}>
            {activeTab === 'dashboard' && (
              <SalesforceDashboard
                dashboardData={dashboardData}
                calculateQuarterlyPerformance={calculateQuarterlyPerformance}
                dateFilter={dateFilter}
                dateRange={dateRange}
                goalValue={goalValue}
                isEditingGoal={isEditingGoal}
                goalInputValue={goalInputValue}
                hoveredCardIndex={hoveredCardIndex}
                timeZone={timeZone}
                account={account}
                onDateFilterChange={handleDateFilterChange}
                onDateRangeChange={(range) => setDateRange(range)}
                onGoalValueChange={setGoalValue}
                onGoalInputChange={setGoalInputValue}
                onEditingGoalChange={setIsEditingGoal}
                onHoveredCardIndexChange={setHoveredCardIndex}
                onTabChange={handleTabChange}
              />
            )}
            {activeTab === 'notifications' && (
              <SalesforceNotifications
                notifications={notifications}
                unreadCount={unreadCount}
                isLoadingNotifications={isLoadingNotifications}
                markingAsRead={markingAsRead}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onDelete={handleDelete}
              />
            )}
            {(activeTab === 'leads' ||
              activeTab === 'contacts' ||
              activeTab === 'opportunities' ||
              activeTab === 'accounts') && (
              <>
                <SalesforceHeaderControls
                  key={activeTab}
                  activeTab={activeTab}
                  searchTerm={searchTerm}
                  viewMode={viewMode}
                  selectedLeadStatus={selectedLeadStatus}
                  selectedOpportunityStatus={selectedOpportunityStatus}
                  selectedOwner={selectedOwner}
                  uniqueStatuses={uniqueStatuses}
                  uniqueOpportunityStages={uniqueOpportunityStages}
                  uniqueOwners={uniqueOwners}
                  columnVisibility={columnVisibility}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                  enableColumnHiding={enableColumnHiding ?? false}
                  onSearchChange={setSearchTerm}
                  onViewModeChange={setViewMode}
                  onLeadStatusChange={setSelectedLeadStatus}
                  onOpportunityStatusChange={setSelectedOpportunityStatus}
                  onOwnerChange={setSelectedOwner}
                  getLeadColumns={getLeadColumns}
                  getContactColumns={getContactColumns}
                  getOpportunityColumns={getOpportunityColumns}
                  getAccountColumns={getAccountColumns}
                />
                {activeTab === 'leads' && (
                  <SalesforceLeadCards
                    data={getData}
                    searchTerm={searchTerm}
                    viewMode={viewMode}
                    isLoading={isLoading}
                    columnVisibility={columnVisibility}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                    enableColumnHiding={enableColumnHiding ?? false}
                    onNameClick={handleNameClick}
                    onCreateTicket={(data) => handleCreateTicket(data, 'lead')}
                    getColumns={getLeadColumns}
                  />
                )}
                {activeTab === 'contacts' && (
                  <SalesforceContactCards
                    data={getData}
                    searchTerm={searchTerm}
                    viewMode={viewMode}
                    isLoading={isLoading}
                    columnVisibility={columnVisibility}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                    enableColumnHiding={enableColumnHiding ?? false}
                    onNameClick={handleNameClick}
                    onCreateTicket={(data) => handleCreateTicket(data, 'contact')}
                    getColumns={getContactColumns}
                  />
                )}
                {activeTab === 'opportunities' && (
                  <SalesforceOpportunityCards
                    data={getData}
                    searchTerm={searchTerm}
                    viewMode={viewMode}
                    isLoading={isLoading}
                    columnVisibility={columnVisibility}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                    enableColumnHiding={enableColumnHiding ?? false}
                    onNameClick={handleNameClick}
                    onCreateTicket={(data) => handleCreateTicket(data, 'opportunity')}
                    getColumns={getOpportunityColumns}
                  />
                )}
                {activeTab === 'accounts' && (
                  <SalesforceAccountCards
                    data={getData}
                    searchTerm={searchTerm}
                    isLoading={isLoading}
                    columnVisibility={columnVisibility}
                    handleColumnVisibilityChange={handleColumnVisibilityChange}
                    enableColumnHiding={enableColumnHiding ?? false}
                    getColumns={getAccountColumns}
                    viewMode={viewMode}
                    onNameClick={handleNameClick}
                    onCreateTicket={(data) => handleCreateTicket(data, 'account')}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesforceDataView;
