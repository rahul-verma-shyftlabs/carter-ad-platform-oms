import { AxiosInstance } from 'axios';
import { getOmsSession, setOmsSession } from '@/lib/oms-session';
import { CRMHttpClient } from './crm-http-client.service';

// const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL;
const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';
export interface SalesforceAuthResponse {
  authorization_url: string;
}

export interface SalesforceConnectionStatus {
  connected: boolean;
  organization_id?: string;
  instance_url?: string;
  expires_at?: string;
}

export interface SalesforceDashboardStats {
  totalLeads: number;
  totalContacts: number;
  totalOpportunities: number;
  totalAccounts: number;
  totalOpportunityValue?: number;
}

export interface SalesforceDashboardData {
  stats: SalesforceDashboardStats;
  leads: SalesforceQueryResult;
  contacts: SalesforceQueryResult;
  opportunities: SalesforceQueryResult;
  accounts: SalesforceQueryResult;
}

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: any[];
}

export interface SalesforceObject {
  name: string;
  label: string;
  keyPrefix: string;
}

export interface SalesforceObjectsResponse {
  sobjects: SalesforceObject[];
}

export default class SalesforceService {
  private httpClient: AxiosInstance;

  constructor() {
    const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
    this.httpClient = crmHttpClient.httpClient;
  }

  private getAuthToken(): string | null {
    return getOmsSession().salesforceToken || null;
  }

  private setAuthToken(token: string): void {
    setOmsSession({ salesforceToken: token });
  }

  private removeAuthToken(): void {
    setOmsSession({ salesforceToken: undefined });
  }

  /**
   * Get headers with Salesforce token for API calls
   */
  private getSalesforceHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      return {};
    }
    return {
      'salesforce_auth_token': token,
    };
  }

  /**
   * Get Salesforce OAuth authorization URL
   * @param accountId - Optional account ID (user_id) to pass as query parameter
   */
  async getAuthorizationUrl(accountId?: string): Promise<SalesforceAuthResponse> {
    const params = accountId ? { user_id: accountId } : {};
    const response = await this.httpClient.post<SalesforceAuthResponse>('/auth/salesforce/authorize', {}, { params });
    return response.data;
  }

  /**
   * Exchange authorization code for JWT token
   * Called from frontend callback page after Salesforce redirects back
   * @param accountId - Frontend GraphQL account ID (e.g., "877")
   */
  async exchangeCodeForToken(code: string, state: string, accountId?: string): Promise<{ 
    access_token: string; 
    refresh_token?: string; 
    user?: { id: string; email: string };
    salesforce_token?: string;  // Salesforce CRM token for localStorage
  }> {
    // Build request body - only include account_id if it has a value
    const requestBody: { code: string; state: string; account_id?: string } = {
      code,
      state,
    };
    
    // Only add account_id if it's a valid string (not undefined, null, or empty)
    if (accountId && typeof accountId === 'string' && accountId.trim() !== '') {
      requestBody.account_id = accountId.trim();
    }
    
    const response = await this.httpClient.post<{ 
      access_token: string; 
      refresh_token?: string; 
      user?: { id: string; email: string };
      salesforce_token?: string;
    }>(
      '/auth/salesforce/callback',
      requestBody
    );
    return response.data;
  }

  /**
   * @deprecated This method is no longer needed. Salesforce token is now returned directly
   * in the OAuth callback response (just like Monday.com), eliminating the need for a
   * separate /crm/tokens API call. The token is stored in localStorage during the callback.
   * 
   * Fetch CRM tokens from backend and store in localStorage
   * Accepts account_id (frontend GraphQL account ID) and POSTs to /crm/tokens
   * @param accountId - Frontend GraphQL account ID (e.g., "877") from Redux state
   */
  async fetchAndStoreTokens(accountId?: string): Promise<void> {
    if (!accountId) {
      return;
    }

    try {
      // POST to /crm/tokens with account_id in body
      // The backend will look up or create user by account_id
      // This is an open endpoint, no auth token required
      const response = await this.httpClient.post<{
        salesforce_token: string | null;
        monday_token: string | null;
        has_salesforce: boolean;
        has_monday: boolean;
      }>('/crm/tokens', {
        user_id: accountId,  // This is actually account_id from frontend
      });

      // Store tokens in localStorage if they exist
      if (response.data.salesforce_token || response.data.monday_token) {
        setOmsSession({
          salesforceToken: response.data.salesforce_token || undefined,
          mondayToken: response.data.monday_token || undefined,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch CRM tokens:', error);
      // Don't throw - this is called during initialization
    }
  }

  /**
   * Check if user has an active Salesforce connection
   * This is completely independent from Monday.com connection status
   * Always checks backend to verify connection exists in database
   * @param userId - Optional user ID from Redux state (used when no auth token available)
   */
  async getConnectionStatus(userId?: string): Promise<SalesforceConnectionStatus> {
    // Get app JWT token from cookies for API calls
    const token = getOmsSession().rmnToken || getOmsSession().crmBackendToken || null;
    
    try {
      // Build query params - include user_id if provided
      const params: any = {};
      if (userId) {
        params.user_id = userId;
      }
      
      // Always check backend to verify connection exists
      // If we have a token, use it; otherwise rely on user_id query param
      const config: any = {
        params,
      };
      
      if (token) {
        config.headers = {
          ...this.getSalesforceHeaders(),
        };
      }
      
      const response = await this.httpClient.get<SalesforceConnectionStatus>('/auth/status', config);
      
      // If connected, token should already be in localStorage from callback
      // Just like Monday.com, the token is returned directly in the callback response
      // No need to fetch from a separate endpoint
      if (!response.data.connected) {
        // If not connected, clear localStorage token
        this.removeAuthToken();
      }
      
      return response.data;
    } catch (error: any) {
      // Connection status check failed - return not connected
      // This is independent from Monday.com connection status
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        // Clear localStorage token if connection doesn't exist
        this.removeAuthToken();
        return { connected: false };
      }
      // For other errors, also return not connected
      return { connected: false };
    }
  }

  /**
   * Refresh Salesforce access token
   */
  async refreshToken(): Promise<{ message: string }> {
    const response = await this.httpClient.post<{ message: string }>(
      '/auth/refresh',
      {},
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Disconnect Salesforce connection
   * NO AUTH REQUIRED - just pass user_id (877) as query param
   */
  async disconnect(): Promise<{ message: string }> {
    // Get user_id from localStorage (set when user logs in)
    const userId = getOmsSession().userId || null;

    if (!userId) {
      throw new Error('User ID not found. Please refresh the page and try again.');
    }

    try {
      // Pass user_id as query param - no auth token needed
      const response = await this.httpClient.post<{ message: string }>(
        `/auth/disconnect?user_id=${userId}`,
        {}
      );
      // Remove token from localStorage if exists
      this.removeAuthToken();
      return response.data;
    } catch (error) {
      // Remove token from localStorage if exists
      this.removeAuthToken();
      throw error;
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(userId?: string): Promise<any> {
    // Backend /users/me endpoint doesn't require auth, just user_id query param
    const params: Record<string, any> = {};
    if (userId) {
      params['user_id'] = userId;
    }

    const response = await this.httpClient.get<any>('/users/me', {
      params,
    });
    return response.data;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(limit: number = 200, forceRefresh: boolean = false): Promise<SalesforceDashboardData> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceDashboardData>('/salesforce/dashboard', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get dashboard stats only
   */
  async getDashboardStats(): Promise<SalesforceDashboardStats> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceDashboardStats>('/salesforce/dashboard/stats', {
      headers,
    });
    return response.data;
  }

  /**
   * Get all leads
   */
  async getLeads(limit: number = 200, forceRefresh: boolean = false): Promise<SalesforceQueryResult> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceQueryResult>('/salesforce/leads', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get single lead by ID
   */
  async getLead(leadId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<any>(`/salesforce/leads/${leadId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get all contacts
   */
  async getContacts(limit: number = 200, forceRefresh: boolean = false): Promise<SalesforceQueryResult> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceQueryResult>('/salesforce/contacts', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get single contact by ID
   */
  async getContact(contactId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<any>(`/salesforce/contacts/${contactId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get all opportunities
   */
  async getOpportunities(limit: number = 200, forceRefresh: boolean = false): Promise<SalesforceQueryResult> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceQueryResult>('/salesforce/opportunities', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get single opportunity by ID
   */
  async getOpportunity(opportunityId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<any>(`/salesforce/opportunities/${opportunityId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get all accounts
   */
  async getAccounts(limit: number = 200, forceRefresh: boolean = false): Promise<SalesforceQueryResult> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceQueryResult>('/salesforce/accounts', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get single account by ID
   */
  async getAccount(accountId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<any>(`/salesforce/accounts/${accountId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * List all available Salesforce objects
   */
  async getObjects(): Promise<SalesforceObjectsResponse> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<SalesforceObjectsResponse>('/salesforce/objects', {
      headers,
    });
    return response.data;
  }

  /**
   * Get Salesforce users (for owner reassignment dropdown)
   */
  async getSalesforceUsers(limit: number = 500): Promise<{ totalSize: number; records: Array<{ Id: string; Name: string }> }> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.get<{ totalSize: number; done: boolean; records: Array<{ Id: string; Name: string }> }>(
      '/salesforce/users',
      { params: { limit }, headers }
    );
    return response.data;
  }

  /**
   * Execute custom SOQL query
   */
  async executeQuery(query: string): Promise<SalesforceQueryResult> {
    const headers = this.getSalesforceHeaders();

    const response = await this.httpClient.post<SalesforceQueryResult>(
      '/salesforce/query',
      { query },
      { headers }
    );
    return response.data;
  }

  /**
   * Store auth token (called from callback page)
   */
  storeAuthToken(token: string): void {
    this.setAuthToken(token);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // ========== Lead CRUD Operations ==========

  /**
   * Create a new Lead
   */
  async createLead(leadData: any): Promise<any> {
    const response = await this.httpClient.post<any>('/salesforce/leads', leadData, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Update an existing Lead
   */
  async updateLead(leadId: string, leadData: any): Promise<any> {
    const response = await this.httpClient.put<any>(`/salesforce/leads/${leadId}`, leadData, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Delete a Lead
   */
  async deleteLead(leadId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/leads/${leadId}`, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
  }

  /**
   * Update Lead status
   */
  async updateLeadStatus(leadId: string, status: string): Promise<any> {
    const response = await this.httpClient.patch<any>(
      `/salesforce/leads/${leadId}/status`,
      { Status: status },
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Get all available Lead statuses
   */
  async getLeadStatuses(): Promise<string[]> {
    const response = await this.httpClient.get<string[]>('/salesforce/leads/statuses', {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Convert Lead to Contact and/or Opportunity
   */
  async convertLead(leadId: string, convertOptions: any): Promise<any> {
    const response = await this.httpClient.post<any>(
      `/salesforce/leads/${leadId}/convert`,
      convertOptions,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  // ========== Contact CRUD Operations ==========

  /**
   * Create a new Contact
   */
  async createContact(contactData: any): Promise<any> {
    const response = await this.httpClient.post<any>('/salesforce/contacts', contactData, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Update an existing Contact
   */
  async updateContact(contactId: string, contactData: any): Promise<any> {
    const response = await this.httpClient.put<any>(
      `/salesforce/contacts/${contactId}`,
      contactData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Delete a Contact
   */
  async deleteContact(contactId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/contacts/${contactId}`, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
  }

  // ========== Opportunity CRUD Operations ==========

  /**
   * Create a new Opportunity
   */
  async createOpportunity(opportunityData: any): Promise<any> {
    const response = await this.httpClient.post<any>(
      '/salesforce/opportunities',
      opportunityData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Update an existing Opportunity
   */
  async updateOpportunity(opportunityId: string, opportunityData: any): Promise<any> {
    const response = await this.httpClient.put<any>(
      `/salesforce/opportunities/${opportunityId}`,
      opportunityData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Delete an Opportunity
   */
  async deleteOpportunity(opportunityId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/opportunities/${opportunityId}`, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
  }

  /**
   * Update Opportunity stage
   */
  async updateOpportunityStage(opportunityId: string, stage: string): Promise<any> {
    const response = await this.httpClient.patch<any>(
      `/salesforce/opportunities/${opportunityId}/stage`,
      { StageName: stage },
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Get all available Opportunity stages
   */
  async getOpportunityStages(): Promise<string[]> {
    const response = await this.httpClient.get<string[]>('/salesforce/opportunities/stages', {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
    return response.data;
  }

  /**
   * CRM Comments
   */
  async createCRMComment(
    objectType: 'lead' | 'contact' | 'opportunity',
    objectId: string,
    commentData: { content: string; created_by_user_account_id: string; created_by_user_name?: string; mentioned_user_account_ids?: string[] }
  ): Promise<any> {
    const response = await this.httpClient.post<any>(
      `/salesforce/${objectType}/${objectId}/comments`,
      commentData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async getCRMComments(
    objectType: 'lead' | 'contact' | 'opportunity',
    objectId: string
  ): Promise<{ comments: any[]; total: number }> {
    const response = await this.httpClient.get<{ comments: any[]; total: number }>(
      `/salesforce/${objectType}/${objectId}/comments`,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async updateCRMComment(commentId: string, commentUpdate: { content: string; mentioned_user_account_ids?: string[] }): Promise<any> {
    const response = await this.httpClient.put<any>(
      `/salesforce/comments/${commentId}`,
      commentUpdate,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async deleteCRMComment(commentId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/comments/${commentId}`, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
  }

  async getChatterFeed(
    recordId: string,
    pageSize: number = 25,
    page: number = 0
  ): Promise<any> {
    const response = await this.httpClient.get<any>(
      `/salesforce/chatter/${recordId}/feed`,
      {
        params: {
          page_size: pageSize,
          page: page,
        },
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async getEvent(eventId: string): Promise<any> {
    const response = await this.httpClient.get<any>(
      `/salesforce/events/${eventId}`,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async createEvent(eventData: {
    subject: string;
    start_datetime: string;
    end_datetime: string;
    what_id?: string;
    who_id?: string;
    location?: string;
    description?: string;
    is_all_day?: boolean;
    reminder_datetime?: string;
  }): Promise<any> {
    const response = await this.httpClient.post<any>(
      `/salesforce/events`,
      eventData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async updateEvent(eventId: string, eventData: {
    subject?: string;
    start_datetime?: string;
    end_datetime?: string;
    location?: string;
    description?: string;
    is_all_day?: boolean;
  }): Promise<any> {
    const response = await this.httpClient.put<any>(
      `/salesforce/events/${eventId}`,
      eventData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/events/${eventId}`, {
      headers: {
        ...this.getSalesforceHeaders(),
      },
    });
  }

  async getRecordEvents(recordId: string, limit: number = 50): Promise<{ records: any[] }> {
    const response = await this.httpClient.get<{ records: any[] }>(
      `/salesforce/events`,
      {
        params: {
          record_id: recordId,
          limit: limit,
        },
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async createTask(taskData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    call_type?: string;
    call_duration?: number;
    description?: string;
    call_date?: string;
  }): Promise<any> {
    const response = await this.httpClient.post<any>(
      `/salesforce/tasks`,
      taskData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async getRecordTasks(recordId: string, limit: number = 50): Promise<{ records: any[] }> {
    const response = await this.httpClient.get<{ records: any[] }>(
      `/salesforce/tasks`,
      {
        params: {
          record_id: recordId,
          limit: limit,
        },
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }

  async createEmailTask(emailData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    description?: string;
    email_date?: string;
    to_address?: string;
    from_address?: string;
  }): Promise<any> {
    // Build description with email addresses if provided
    let description = emailData.description || '';
    const emailInfo: string[] = [];
    if (emailData.to_address) {
      emailInfo.push(`To: ${emailData.to_address}`);
    }
    if (emailData.from_address) {
      emailInfo.push(`From: ${emailData.from_address}`);
    }
    if (emailInfo.length > 0) {
      description = emailInfo.join('\n') + (description ? `\n\n${description}` : '');
    }

    // Create email as a Task
    // Prefix subject with "Email: " to identify emails (since CallType doesn't support "Email")
    const emailSubject = emailData.subject.startsWith('Email: ') 
      ? emailData.subject 
      : `Email: ${emailData.subject}`;
    
    const taskData = {
      subject: emailSubject,
      what_id: emailData.what_id,
      who_id: emailData.who_id,
      status: emailData.status || 'Completed',
      priority: emailData.priority || 'Normal',
      // Don't set call_type for emails - Salesforce CallType is restricted picklist
      // We'll identify emails by subject prefix
      description: description || undefined,
      call_date: emailData.email_date,
    };

    const response = await this.httpClient.post<any>(
      `/salesforce/tasks`,
      taskData,
      {
        headers: {
          ...this.getSalesforceHeaders(),
        },
      }
    );
    return response.data;
  }
}
