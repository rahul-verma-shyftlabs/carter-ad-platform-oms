import { User, UsersAdvancedQuery } from 'types';
import { getOmsSession } from '@/lib/oms-session';
import { setUser } from '@/redux/actions';
import logger from '@/common/logger';

const USER_BY_TOKEN_QUERY = `
  query UserByToken {
    userByToken {
      id
      accountId
      name
      email
      timeZoneName
      allowedAccounts {
        id
        name
        slug
        timeZoneName
      }
    }
  }
`;

const USERS_ADVANCED_QUERY = `
  query UsersAdvanced($page: Int!, $pageSize: Int!, $filters: UserAdvancedFilters!, $sort: String!) {
    usersAdvanced(page: $page, pageSize: $pageSize, filters: $filters, sort: $sort) {
      totalCount
      content {
        id
        name
        email
        accountId
        firstName
        lastName
      }
    }
  }
`;

type GetAllUsers = {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
  sort?: string;
};

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const session = getOmsSession();
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session.rmnToken ? { Authorization: `Bearer ${session.rmnToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL proxy failed (${response.status})`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'GraphQL error');
  }
  return payload.data as T;
}

export default class UsersService {
  async getAllUsers(options?: GetAllUsers, _context?: { silent?: boolean }): Promise<{ data: UsersAdvancedQuery }> {
    try {
      const { page = 1, pageSize = 10, filters = {}, sort = '' } = options || {};
      const data = await graphqlRequest<UsersAdvancedQuery>(USERS_ADVANCED_QUERY, {
        page,
        pageSize,
        filters,
        sort,
      });
      return { data };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const data = await graphqlRequest<{ userByToken: User }>(USER_BY_TOKEN_QUERY);
      const user = data.userByToken || {};
      setUser(user);
      return user;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}
