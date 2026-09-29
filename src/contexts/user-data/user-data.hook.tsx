import React, { PropsWithChildren, useContext } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/redux/reducers';
import { getOmsSession } from '@/lib/oms-session';
import { User } from 'types';

export type TUserContext = {
  user?: User;
  isLoading: boolean;
  isLoadingPermission?: boolean;
  refetchUser: () => Promise<void>;
  refetchPermissions: () => Promise<void>;
};

export const UserDataContext = React.createContext<TUserContext>({
  isLoading: false,
  refetchUser: async () => {},
  refetchPermissions: async () => {},
});

export const UserDataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const user = useSelector((state: IRootState) => state.common.user);
  const session = getOmsSession();
  const value: TUserContext = {
    user: user?.id ? user : session.userId ? { id: session.userId } : user,
    isLoading: false,
    isLoadingPermission: false,
    refetchUser: async () => {},
    refetchPermissions: async () => {},
  };
  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

function useUser() {
  return useContext(UserDataContext);
}

export default useUser;
