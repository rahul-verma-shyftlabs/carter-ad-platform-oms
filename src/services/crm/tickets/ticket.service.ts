import { AxiosInstance } from 'axios';
import { getOmsSession } from '@/lib/oms-session';
import { CRMHttpClient } from '../salesforce/crm-http-client.service';

// const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL;
const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export enum TicketStatus {
  UNASSIGNED = 'unassigned',
  OPEN = 'open',
  CLOSED = 'closed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  assigned_user_account_id?: string;
  created_by_user_account_id: string;
  lead_data?: any;
  source_type?: 'lead' | 'contact' | 'opportunity';
  source_id?: string;  // Salesforce record ID
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  description?: string;
  status?: TicketStatus;
  assigned_user_account_id?: string;
  created_by_user_account_id?: string;
  lead_data?: any;
  source_type?: 'lead' | 'contact' | 'opportunity';
  source_id?: string;  // Salesforce record ID
  due_date?: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  status?: TicketStatus;
  assigned_user_account_id?: string;
  due_date?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  content: string;
  created_by_user_account_id: string;
  created_by_user_name: string;
  mentioned_user_account_ids?: string[];
  attachments?: Array<{ url: string; name: string; type?: string; size?: number }>;
  created_at: string;
  updated_at: string;
}

export interface TicketCommentCreate {
  content: string;
  created_by_user_account_id?: string;
  created_by_user_name?: string;
  mentioned_user_account_ids?: string[];
  attachments?: Array<{ url: string; name: string; type?: string; size?: number }>;
}

export interface TicketCommentListResponse {
  comments: TicketComment[];
  total: number;
}

export default class TicketService {
  private httpClient: AxiosInstance;

  constructor() {
    const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
    this.httpClient = crmHttpClient.httpClient;
  }

  private getAuthToken(): string | null {
    const session = getOmsSession();
    return session.crmBackendToken || session.mondayToken || null;
  }

  private getHeaders() {
    const token = this.getAuthToken();
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new ticket
   */
  async createTicket(ticketData: TicketCreate): Promise<Ticket> {
    // Ensure status is sent as its string value (enum value, not key)
    // For string enums, TicketStatus.TO_DO is already 'to_do', but ensure it's a string
    const payload: any = {
      ...ticketData,
    };
    
    // Explicitly convert enum to string value if it's an enum
    if (payload.status && typeof payload.status !== 'string') {
      payload.status = payload.status as string;
    }
    
    const response = await this.httpClient.post<Ticket>('/tickets', payload, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get all tickets with optional filters
   */
  async getTickets(params?: {
    skip?: number;
    limit?: number;
    status?: TicketStatus;
    assigned_user_account_id?: string;
    created_by_user_account_id?: string;
  }): Promise<TicketListResponse> {
    const response = await this.httpClient.get<TicketListResponse>('/tickets', {
      params,
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get tickets for logged-in user
   */
  async getMyTickets(userAccountId: string): Promise<TicketListResponse> {
    const response = await this.httpClient.get<TicketListResponse>('/tickets/my-tickets', {
      params: { user_account_id: userAccountId },
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get tickets by source (lead, contact, or opportunity)
   */
  async getTicketsBySource(sourceType: 'lead' | 'contact' | 'opportunity', sourceId: string): Promise<TicketListResponse> {
    const response = await this.httpClient.get<TicketListResponse>(
      `/tickets/by-source/${sourceType}/${sourceId}`,
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Get a single ticket by ID
   */
  async getTicket(ticketId: string): Promise<Ticket> {
    const response = await this.httpClient.get<Ticket>(`/tickets/${ticketId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Update a ticket
   */
  async updateTicket(ticketId: string, ticketUpdate: TicketUpdate): Promise<Ticket> {
    // Ensure status is sent as string value if it's an enum
    const payload: any = {
      ...ticketUpdate,
    };
    if (payload.status && typeof payload.status !== 'string') {
      payload.status = payload.status as string;
    }
    
    const response = await this.httpClient.put<Ticket>(`/tickets/${ticketId}`, payload, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Update ticket status only
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
    // Convert enum to string value
    const statusValue = typeof status === 'string' ? status : (status as string);
    
    const response = await this.httpClient.patch<Ticket>(
      `/tickets/${ticketId}/status`,
      {},
      {
        params: { status: statusValue },
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId: string): Promise<void> {
    await this.httpClient.delete(`/tickets/${ticketId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Create a comment on a ticket
   */
  async createComment(ticketId: string, commentData: TicketCommentCreate): Promise<TicketComment> {
    const response = await this.httpClient.post<TicketComment>(
      `/tickets/${ticketId}/comments`,
      commentData,
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Get all comments for a ticket
   */
  async getTicketComments(
    ticketId: string,
    params?: {
      skip?: number;
      limit?: number;
    }
  ): Promise<TicketCommentListResponse> {
    const response = await this.httpClient.get<TicketCommentListResponse>(
      `/tickets/${ticketId}/comments`,
      {
        params,
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, commentUpdate: TicketCommentCreate): Promise<TicketComment> {
    const response = await this.httpClient.put<TicketComment>(
      `/comments/${commentId}`,
      commentUpdate,
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await this.httpClient.delete(`/comments/${commentId}`, {
      headers: this.getHeaders(),
    });
  }
}
