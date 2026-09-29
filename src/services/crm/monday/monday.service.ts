import { AxiosInstance } from 'axios';
import { getOmsSession, setOmsSession } from '@/lib/oms-session';
import { CRMHttpClient } from '../salesforce/crm-http-client.service';

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export interface MondayAuthResponse {
  authorization_url: string;
  state: string;
}

export interface MondayConnectionStatus {
  connected: boolean;
  account_id?: number;
  workspace_id?: number;
  workspace_name?: string;
  connected_at?: string;
}

export interface MondayView {
  id: string;
  name: string;
  type: string;
  settings_str?: string;
}

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  state?: string;
  board_kind?: string;
  permissions?: string;
  workspace?: {
    id: string;
    name: string;
  };
  groups?: MondayGroup[];
  columns?: MondayColumn[];
  items?: MondayItem[];
  views?: MondayView[];
  group_by_column_id?: string | null; // Column ID used for grouping
}

export interface MondayGroup {
  id: string;
  title: string;
  color?: string;
  position?: number;
  archived?: boolean;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
  width?: number;
}

export interface MondayItem {
  id: string;
  name: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: string;
    name: string;
    photo_small?: string;
  };
  group?: {
    id: string;
    title: string;
    color?: string;
  };
  column_values?: MondayColumnValue[];
  subitems?: MondaySubitem[];
  updates?: MondayUpdate[];
}

export interface MondayColumnValue {
  id: string;
  type: string;
  text?: string;
  value?: string;
  column?: {
    id: string;
    title: string;
    type?: string;
  };
}

export interface MondaySubitem {
  board?: {
    id: string;
  };
  id: string;
  name: string;
  column_values?: MondayColumnValue[];
}

export interface MondayUpdate {
  id: string;
  body: string;
  text_body?: string;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: string;
    name: string;
    photo_small?: string;
  };
  replies?: MondayUpdate[];
}

export interface MondayUser {
  id: string;
  name: string;
  email?: string;
  photo_small?: string;
  title?: string;
  enabled?: boolean;
}

export interface MondayAPIResponse {
  success: boolean;
  [key: string]: any;
}

export default class MondayService {
  private httpClient: AxiosInstance;

  constructor() {
    const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
    this.httpClient = crmHttpClient.httpClient;
  }

  private getAuthToken(): string | null {
    return getOmsSession().mondayToken || null;
  }

  private setAuthToken(token: string): void {
    setOmsSession({ mondayToken: token });
  }

  private removeAuthToken(): void {
    setOmsSession({ mondayToken: undefined, mondayUserId: undefined });
  }

  private storeAuthToken(token: string): void {
    this.setAuthToken(token);
  }

  /**
   * Get Monday.com OAuth authorization URL
   */
  async getAuthorizationUrl(accountId?: string): Promise<MondayAuthResponse> {
    const params = accountId ? { user_id: accountId } : {};
    const response = await this.httpClient.post<MondayAuthResponse>('/auth/monday/authorize', {}, { params });
    return response.data;
  }

  /**
   * Exchange authorization code for connection (no authentication required)
   */
  async exchangeCodeForConnection(
    code: string,
    state?: string,
    accountId?: string
  ): Promise<{ success: boolean; message: string; connection?: any; monday_token?: string; user_id?: string }> {
    // No authentication required for Monday.com callback
    // Pass account_id (GraphQL user ID like "877") to map connection to this user
    const response = await this.httpClient.post<{ success: boolean; message: string; connection?: any; monday_token?: string; user_id?: string }>(
      '/auth/monday/callback',
      { code, state, account_id: accountId }
    );
    return response.data;
  }

  /**
   * Check if user has an active Monday.com connection
   */
  async getConnectionStatus(userId?: string): Promise<MondayConnectionStatus> {
    // Get user_id from parameter, cookies (set by API route), localStorage, or return not connected
    let targetUserId: string | undefined = userId;
    if (!targetUserId) {
      targetUserId = getOmsSession().mondayUserId || getOmsSession().userId;
    }
    
    if (!targetUserId) {
      return { connected: false };
    }

    try {
      // Use user_id query parameter (no auth token required)
      const response = await this.httpClient.get<MondayConnectionStatus>('/auth/monday/status', {
        params: { user_id: targetUserId },
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        // Clear stored user_id on error
        setOmsSession({ mondayUserId: undefined });
        return { connected: false };
      }
      throw error;
    }
  }

  /**
   * Disconnect Monday.com connection
   * NO AUTH REQUIRED - just pass user_id (877) as query param
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    // Get user_id from localStorage (set when user logs in)
    const userId = getOmsSession().userId || null;

    if (!userId) {
      throw new Error('User ID not found. Please refresh the page and try again.');
    }

    try {
      // Pass user_id as query param - no auth token needed
      const response = await this.httpClient.post<{ success: boolean; message: string }>(
        `/auth/monday/disconnect?user_id=${userId}`,
        {}
      );
      // Remove token from localStorage if exists
      this.removeAuthToken();
      return response.data;
    } catch (error: any) {
      // Remove token from localStorage if exists
      this.removeAuthToken();
      throw error;
    }
  }

  // BOARDS
  async getBoards(limit: number = 50): Promise<MondayBoard[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    // Backend will fetch token from database using user_id
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards?limit=${limit}`
    );
    return response.data.boards || [];
  }

  async getBoard(boardId: string, silent: boolean = false): Promise<MondayBoard> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const config: any = {};
    if (silent) {
      config.silent = true;
    }

    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards/${boardId}`,
      config
    );
    
    // Transform the response to map items_page.items to items
    const board = response.data.board;
    
    if (board && board.items_page && board.items_page.items) {
      board.items = board.items_page.items;
      // Optionally remove items_page if not needed
      delete board.items_page;
    }
    
    return board as MondayBoard;
  }

  async createBoard(name: string, boardKind: string = 'public', description?: string, workspaceId?: number): Promise<MondayBoard> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      '/monday/boards',
      { name, board_kind: boardKind, description, workspace_id: workspaceId },
    );
    return response.data.board;
  }

  async updateBoard(boardId: string, name?: string, description?: string): Promise<MondayBoard> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/boards/${boardId}`,
      { name, description },
    );
    return response.data.board;
  }

  async deleteBoard(boardId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/boards/${boardId}`);
  }

  // GROUPS
  async getGroups(boardId: string): Promise<MondayGroup[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards/${boardId}/groups`,
    );
    return response.data.groups || [];
  }

  async createGroup(boardId: string, groupName: string, groupColor?: string): Promise<MondayGroup> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/boards/${boardId}/groups`,
      { group_name: groupName, group_color: groupColor },
    );
    return response.data.group;
  }

  async updateGroup(boardId: string, groupId: string, groupAttribute: string, newValue: string): Promise<MondayGroup> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/groups/${groupId}?board_id=${boardId}`,
      { group_attribute: groupAttribute, new_value: newValue },
    );
    return response.data.group;
  }

  async deleteGroup(boardId: string, groupId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/groups/${groupId}?board_id=${boardId}`);
  }

  // ITEMS
  async getItems(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards/${boardId}/items?limit=${limit}`,
    );
    return response.data.items || [];
  }

  async getItem(itemId: string): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/items/${itemId}`,
    );
    return response.data.item;
  }

  async createItem(boardId: string, groupId: string, itemName: string, columnValues?: Record<string, any>): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const requestBody: any = { 
      group_id: groupId, 
      item_name: itemName 
    };
    // Only include column_values if it's provided and not empty
    if (columnValues && Object.keys(columnValues).length > 0) {
      requestBody.column_values = columnValues;
    }
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/boards/${boardId}/items`,
      requestBody,
    );
    return response.data.item;
  }

  async updateItem(itemId: string, itemName?: string, boardId?: string): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    if (!boardId) {
      throw new Error('Board ID is required to update item name');
    }

    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/items/${itemId}?board_id=${boardId}`,
      { item_name: itemName }
    );
    return response.data.item;
  }

  async deleteItem(itemId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/items/${itemId}`);
  }

  async duplicateItem(boardId: string, itemId: string, withUpdates: boolean = false): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/boards/${boardId}/items/${itemId}/duplicate`,
      { with_updates: withUpdates },
    );
    return response.data.item;
  }

  async moveItem(itemId: string, groupId: string): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/items/${itemId}/move?group_id=${groupId}`,
      {},
    );
    return response.data.item;
  }

  async archiveItem(itemId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.post(
      `/monday/items/${itemId}/archive`,
      {}
    );
  }

  // COLUMN VALUES
  async updateColumnValue(boardId: string, itemId: string, columnId: string, value: any): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const config: any = {
      silent: true, // Prevent global loader for cell updates
    };

    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/items/${itemId}/column-values/${columnId}?board_id=${boardId}`,
      value,
      config
    );
    return response.data.item;
  }

  async updateMultipleColumnValues(boardId: string, itemId: string, columnValues: Record<string, any>): Promise<MondayItem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/items/${itemId}/column-values?board_id=${boardId}`,
      columnValues,
    );
    return response.data.item;
  }

  // COLUMNS
  async getColumns(boardId: string): Promise<MondayColumn[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards/${boardId}/columns`,
    );
    return response.data.columns || [];
  }

  async createColumn(boardId: string, title: string, columnType: string, defaults?: Record<string, any>): Promise<MondayColumn> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/boards/${boardId}/columns`,
      { title, column_type: columnType, defaults },
    );
    return response.data.column;
  }

  async updateColumn(boardId: string, columnId: string, title?: string, columnProperty?: string, value?: string): Promise<MondayColumn> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/columns/${columnId}?board_id=${boardId}`,
      { title, column_property: columnProperty, value },
    );
    return response.data.column;
  }

  async deleteColumn(boardId: string, columnId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/columns/${columnId}?board_id=${boardId}`);
  }

  // UPDATES (Comments)
  async getUpdates(itemId: string, limit: number = 25): Promise<MondayUpdate[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/items/${itemId}/updates?limit=${limit}`
    );
    return response.data.updates || [];
  }

  async createUpdate(itemId: string, body: string): Promise<MondayUpdate> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.post<MondayAPIResponse>(
      `/monday/items/${itemId}/updates`,
      { body }
    );
    return response.data.update;
  }

  async deleteUpdate(updateId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/updates/${updateId}`);
  }

  // SUBITEMS
  async createSubitem(itemId: string, itemName: string, columnValues?: Record<string, any>): Promise<MondaySubitem> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const requestBody: any = { 
      item_name: itemName 
    };
    // Only include column_values if it's provided and not empty
    if (columnValues && Object.keys(columnValues).length > 0) {
      requestBody.column_values = columnValues;
    }
    try {
      const response = await this.httpClient.post<MondayAPIResponse>(
        `/monday/items/${itemId}/subitems`,
        requestBody,
      );
      // Check if response has subitem
      if (response.data?.subitem) {
        return response.data.subitem;
      }
      // Fallback: check if response.data itself is the subitem
      if (response.data && (response.data as any).id && (response.data as any).name) {
        return response.data as unknown as MondaySubitem;
      }
      throw new Error('Invalid response format from create subitem API');
    } catch (error: any) {
      console.error('Create subitem error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  // USERS
  async getUsers(): Promise<MondayUser[]> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    try {
      const response = await this.httpClient.get<MondayAPIResponse>(
        '/monday/users'
      );
      
      // Handle response structure: { success: true, users: [...] }
      if (response.data && response.data.users) {
        const users = response.data.users;
        return Array.isArray(users) ? users : [];
      }
      
      // Fallback: if response.data is the users array directly
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch {
      // Handle permission errors gracefully - if the app doesn't have permission
      // to query users, return empty array instead of throwing
      return [];
    }
  }

  async getCurrentUser(): Promise<MondayUser> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      '/monday/users/me',
    );
    return response.data.user;
  }

  // BOARD SETTINGS (Group By)
  async getBoardSettings(boardId: string): Promise<{ board_id: string; group_by_column_id: string | null }> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.get<MondayAPIResponse>(
      `/monday/boards/${boardId}/settings`
    );
    // Handle response structure: { success: true, board_id: "...", group_by_column_id: "..." }
    if (response.data && 'board_id' in response.data) {
      return {
        board_id: (response.data as any).board_id,
        group_by_column_id: (response.data as any).group_by_column_id
      };
    }
    return (response.data as any) as { board_id: string; group_by_column_id: string | null };
  }

  async updateBoardSettings(boardId: string, groupByColumnId: string | null): Promise<{ board_id: string; group_by_column_id: string | null }> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    const response = await this.httpClient.put<MondayAPIResponse>(
      `/monday/boards/${boardId}/settings`,
      { group_by_column_id: groupByColumnId }
    );
    
    // Handle response structure: { success: true, board_id: "...", group_by_column_id: "..." }
    if (response.data && 'board_id' in response.data) {
      return {
        board_id: (response.data as any).board_id,
        group_by_column_id: (response.data as any).group_by_column_id
      };
    }
    
    // Fallback: if response.data is the settings object directly
    return (response.data as any) as { board_id: string; group_by_column_id: string | null };
  }

  async deleteBoardSettings(boardId: string): Promise<void> {
    // NO AUTH REQUIRED - user_id is automatically added by HTTP client
    await this.httpClient.delete(`/monday/boards/${boardId}/settings`);
  }
}
