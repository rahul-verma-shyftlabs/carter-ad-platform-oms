export type Maybe<T> = T | null | undefined;

export enum SectionType {
  Campaign = 'CAMPAIGN',
  Reporting = 'REPORTING',
  SharedWallet = 'SHARED_WALLET',
  User = 'USER',
  Wallet = 'WALLET',
}

export type User = {
  id?: string;
  accountId?: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timeZoneName?: string;
  allowedAccounts?: Array<Account | null> | null;
};

export type Account = {
  id?: string;
  name?: string;
  slug?: string;
  timeZoneName?: string;
};

export type UsersAdvancedQuery = {
  usersAdvanced?: {
    totalCount?: number;
    content?: User[] | null;
  } | null;
};
