import { DateTimeType } from '@/lib/date-time-parser';
import { SalesforceDashboardData } from '@/services/crm/salesforce/salesforce.service';
import { Notification } from '@/services/notifications/notification.service';

export type TabType = 'dashboard' | 'leads' | 'contacts' | 'opportunities' | 'ad-ops-overview' | 'accounts' | 'notifications';
export type ViewMode = 'card' | 'table';

export enum DATE_FILTER_ENUM {
  CUSTOM = 'Custom',
  LAST_30_DAYS = 'Last 30 Days',
  LAST_90_DAYS = 'Last 90 Days',
}

export interface QuarterlyPerformanceData {
  monthlyData: Array<{
    month: string;
    closed: number;
    openHighProb: number;
    closedPlusOpen: number;
    goal: number;
  }>;
  totalClosed: number;
  totalOpenHighProb: number;
  goalValue: number;
}

export interface DashboardProps {
  dashboardData: SalesforceDashboardData | undefined;
  calculateQuarterlyPerformance: QuarterlyPerformanceData | null;
  dateFilter: DATE_FILTER_ENUM;
  dateRange: {
    startDate: DateTimeType | null;
    endDate: DateTimeType | null;
  };
  goalValue: number | null;
  isEditingGoal: boolean;
  goalInputValue: string;
  hoveredCardIndex: number | null;
  timeZone: string;
  account: any;
  onDateFilterChange: (filter: string) => void;
  onDateRangeChange: (range: { startDate: DateTimeType; endDate: DateTimeType }) => void;
  onGoalValueChange: (value: number | null) => void;
  onGoalInputChange: (value: string) => void;
  onEditingGoalChange: (editing: boolean) => void;
  onHoveredCardIndexChange: (index: number | null) => void;
  onTabChange: (tab: TabType) => void;
}

export interface CardComponentProps {
  data: any[];
  searchTerm: string;
  viewMode: ViewMode;
  isLoading: boolean;
  columnVisibility: any;
  handleColumnVisibilityChange: (visibility: any) => void;
  enableColumnHiding: boolean;
  onNameClick: (record: any) => void;
  onCreateTicket: (data: any, sourceType: 'lead' | 'contact' | 'opportunity') => void;
  getColumns: () => any[];
}

export interface HeaderControlsProps {
  activeTab: TabType;
  searchTerm: string;
  viewMode: ViewMode;
  selectedLeadStatus: string;
  selectedOpportunityStatus: string;
  selectedOwner: string;
  uniqueStatuses: string[];
  uniqueOpportunityStages: string[];
  uniqueOwners: string[];
  columnVisibility: any;
  handleColumnVisibilityChange: (visibility: any) => void;
  enableColumnHiding: boolean;
  onSearchChange: (term: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLeadStatusChange: (status: string) => void;
  onOpportunityStatusChange: (status: string) => void;
  onOwnerChange: (owner: string) => void;
  getLeadColumns: () => any[];
  getContactColumns: () => any[];
  getOpportunityColumns: () => any[];
  getAccountColumns: () => any[];
}

export interface NotificationsProps {
  notifications: Notification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  markingAsRead: string | null;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (notificationId: string) => void;
}
