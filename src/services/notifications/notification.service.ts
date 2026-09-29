import { AxiosInstance } from 'axios';
import { CRMHttpClient } from '../crm/salesforce/crm-http-client.service';
import { getOmsSession } from '@/lib/oms-session';

export interface Notification {
  id: string;
  user_account_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity?: {
    type: string;
    comment_id?: string;
    comment_type?: string;
    object_type: string;
    object_id: string;
  };
  is_read: boolean;
  triggered_by_user_account_id?: string;
  triggered_by_user_name?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

// const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL;
const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export default class NotificationService {
  private httpClient: AxiosInstance;

  constructor() {
    // Use CRMHttpClient which handles authentication automatically
    // Note: Notification API doesn't require auth (only user_account_id), but CRMHttpClient
    // will add token if available without throwing errors
    const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
    this.httpClient = crmHttpClient.httpClient;
  }

  /**
   * Get notifications for the current user
   * Note: Backend doesn't require authentication, only user_account_id
   */
  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false,
    userAccountId?: string
  ): Promise<NotificationListResponse> {
    const finalUserId = getOmsSession().userId || userAccountId;
    
    if (!finalUserId) {
      throw new Error('userAccountId is required');
    }

    const params: Record<string, any> = {
      limit,
      offset,
      unread_only: unreadOnly,
      user_account_id: finalUserId, // Use same value as user_id (e.g., "877")
    };

    // CRMHttpClient will automatically add token if available, but it's not required
    const response = await this.httpClient.get<NotificationListResponse>(
      '/notifications',
      {
        params,
      }
    );
    return response.data;
  }

  /**
   * Get unread notification count
   * Note: Backend doesn't require authentication, only user_account_id
   */
  async getUnreadCount(userAccountId?: string): Promise<number> {
    const finalUserId = getOmsSession().userId || userAccountId;
    
    if (!finalUserId) {
      throw new Error('userAccountId is required');
    }

    const params: Record<string, any> = {
      user_account_id: finalUserId, // Use same value as user_id (e.g., "877")
    };

    // CRMHttpClient will automatically add token if available, but it's not required
    const response = await this.httpClient.get<{ unread_count: number }>(
      '/notifications/unread-count',
      {
        params,
      }
    );
    return response.data.unread_count;
  }

  /**
   * Mark a notification as read
   * Note: Backend doesn't require authentication, only user_account_id
   */
  async markAsRead(notificationId: string, userAccountId?: string): Promise<Notification> {
    const finalUserId = getOmsSession().userId || userAccountId;
    
    if (!finalUserId) {
      throw new Error('userAccountId is required');
    }

    const params: Record<string, any> = {
      user_account_id: finalUserId, // Use same value as user_id (e.g., "877")
      user_id: finalUserId, // Pass same value for user_id
    };

    // CRMHttpClient will automatically add token if available, but it's not required
    const response = await this.httpClient.patch<Notification>(
      `/notifications/${notificationId}/read`,
      {},
      {
        params,
      }
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   * Note: Backend doesn't require authentication, only user_account_id
   */
  async markAllAsRead(userAccountId?: string): Promise<number> {
    const finalUserId = getOmsSession().userId || userAccountId;
    
    if (!finalUserId) {
      throw new Error('userAccountId is required');
    }

    const params: Record<string, any> = {
      user_account_id: finalUserId, // Use same value as user_id (e.g., "877")
    };

    // CRMHttpClient will automatically add token if available, but it's not required
    const response = await this.httpClient.post<{ marked_count: number }>(
      '/notifications/mark-all-read',
      {},
      {
        params,
      }
    );
    return response.data.marked_count;
  }

  /**
   * Delete a notification
   * Note: Backend doesn't require authentication, only user_account_id
   */
  async deleteNotification(notificationId: string, userAccountId?: string): Promise<void> {
    const finalUserId = getOmsSession().userId || userAccountId;
    
    if (!finalUserId) {
      throw new Error('userAccountId is required');
    }

    const params: Record<string, any> = {
      user_account_id: finalUserId, // Use same value as user_id (e.g., "877")
    };

    // CRMHttpClient will automatically add token if available, but it's not required
    await this.httpClient.delete(`/notifications/${notificationId}`, {
      params,
    });
  }
}
