import { AxiosInstance } from 'axios';
import { getOmsSession } from '@/lib/oms-session';
import { CRMHttpClient } from '../salesforce/crm-http-client.service';

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export interface CarterOMSDashboardStats {
  totalLeads: number;
  totalContacts: number;
  totalOpportunities: number;
  totalAccounts: number;
  totalOpportunityValue?: number;
}

export interface CarterOMSDashboardData {
  stats: CarterOMSDashboardStats;
  leads: CarterOMSQueryResult;
  contacts: CarterOMSQueryResult;
  opportunities: CarterOMSQueryResult;
  accounts: CarterOMSQueryResult;
}

export interface CarterOMSQueryResult {
  totalSize: number;
  done: boolean;
  records: any[];
}

export interface CarterOMSUser {
  id: string;
  email: string;
  name?: string;
  account_id?: string;
}

export default class CarterOMSService {
  private httpClient: AxiosInstance;

  constructor() {
    const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
    this.httpClient = crmHttpClient.httpClient;
  }

  private getAuthToken(): string | null {
    return getOmsSession().salesforceToken || null;
  }

  private getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      return {};
    }
    return {
      'salesforce_auth_token': token,
    };
  }

  /**
   * Get current user from /users/me endpoint
   * @param accountId - Optional account_id to pass as query parameter
   */
  async getCurrentUser(accountId?: string): Promise<CarterOMSUser> {
    const params = accountId ? { user_id: accountId } : {};
    const response = await this.httpClient.get<CarterOMSUser>('/users/me', {
      params,
    });
    return response.data;
  }

  /**
   * Get comprehensive dashboard data including all CRM entities
   * This fetches leads, contacts, opportunities, and accounts from Salesforce API
   * @param limit - Number of records to fetch per entity type
   * @param forceRefresh - Whether to bypass cache
   */
  async getDashboard(limit: number = 200, forceRefresh: boolean = false): Promise<CarterOMSDashboardData> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get<CarterOMSDashboardData>('/salesforce/dashboard', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get leads from Salesforce
   */
  async getLeads(limit: number = 200, forceRefresh: boolean = false): Promise<CarterOMSQueryResult> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get<CarterOMSQueryResult>('/salesforce/leads', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get contacts from Salesforce
   */
  async getContacts(limit: number = 200, forceRefresh: boolean = false): Promise<CarterOMSQueryResult> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get<CarterOMSQueryResult>('/salesforce/contacts', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get opportunities from Salesforce
   */
  async getOpportunities(limit: number = 200, forceRefresh: boolean = false): Promise<CarterOMSQueryResult> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get<CarterOMSQueryResult>('/salesforce/opportunities', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get accounts from Salesforce
   */
  async getAccounts(limit: number = 200, forceRefresh: boolean = false): Promise<CarterOMSQueryResult> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get<CarterOMSQueryResult>('/salesforce/accounts', {
      params: { limit, force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get a specific lead by ID
   */
  async getLeadById(leadId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get(`/salesforce/leads/${leadId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get a specific contact by ID
   */
  async getContactById(contactId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get(`/salesforce/contacts/${contactId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get a specific opportunity by ID
   */
  async getOpportunityById(opportunityId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get(`/salesforce/opportunities/${opportunityId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Get a specific account by ID
   */
  async getAccountById(accountId: string, forceRefresh: boolean = false): Promise<any> {
    const headers = this.getHeaders();

    const response = await this.httpClient.get(`/salesforce/accounts/${accountId}`, {
      params: { force_refresh: forceRefresh },
      headers,
    });
    return response.data;
  }

  /**
   * Create a new lead
   */
  async createLead(leadData: any): Promise<any> {
    const response = await this.httpClient.post('/salesforce/leads', leadData, {
      headers: {
        ...this.getHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Create a new contact
   */
  async createContact(contactData: any): Promise<any> {
    const response = await this.httpClient.post('/salesforce/contacts', contactData, {
      headers: {
        ...this.getHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Create a new opportunity
   */
  async createOpportunity(opportunityData: any): Promise<any> {
    const response = await this.httpClient.post('/salesforce/opportunities', opportunityData, {
      headers: {
        ...this.getHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Update a lead
   */
  async updateLead(leadId: string, leadData: any): Promise<any> {
    const response = await this.httpClient.put(`/salesforce/leads/${leadId}`, leadData, {
      headers: {
        ...this.getHeaders(),
      },
    });
    return response.data;
  }

  /**
   * Update a contact
   */
  async updateContact(contactId: string, contactData: any): Promise<any> {
    const response = await this.httpClient.put(
      `/salesforce/contacts/${contactId}`,
      contactData,
      {
        headers: {
          ...this.getHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(opportunityId: string, opportunityData: any): Promise<any> {
    const response = await this.httpClient.put(
      `/salesforce/opportunities/${opportunityId}`,
      opportunityData,
      {
        headers: {
          ...this.getHeaders(),
        },
      }
    );
    return response.data;
  }

  /**
   * Delete a lead
   */
  async deleteLead(leadId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/leads/${leadId}`, {
      headers: {
        ...this.getHeaders(),
      },
    });
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/contacts/${contactId}`, {
      headers: {
        ...this.getHeaders(),
      },
    });
  }

  /**
   * Delete an opportunity
   */
  async deleteOpportunity(opportunityId: string): Promise<void> {
    await this.httpClient.delete(`/salesforce/opportunities/${opportunityId}`, {
      headers: {
        ...this.getHeaders(),
      },
    });
  }
}
