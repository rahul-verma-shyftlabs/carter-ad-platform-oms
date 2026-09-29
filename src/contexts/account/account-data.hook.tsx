import React, { PropsWithChildren, useContext, useMemo } from 'react';
import { Account, Maybe } from 'types';
import useUser from '@/contexts/user-data/user-data.hook';
import { getOmsSession } from '@/lib/oms-session';

type TAccountContext = {
  account?: Maybe<Account>;
  timeZone: string;
};

export const AccountDataContext = React.createContext<TAccountContext>({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export const AccountDataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user } = useUser();
  const session = getOmsSession();
  const timeZone = user?.timeZoneName || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const value = useMemo(
    () => ({
      account: user?.allowedAccounts?.find(item => item?.id === (user?.accountId || session.userId)) || {
        id: user?.accountId || session.userId,
      },
      timeZone,
    }),
    [user, session.userId, timeZone],
  );
  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>;
};

function useAccount() {
  return useContext(AccountDataContext);
}

export default useAccount;
