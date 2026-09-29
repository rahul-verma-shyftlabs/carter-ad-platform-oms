import { User } from 'types';
import { IAppConfigs } from '@/common/constants';
import { AlertProps } from '@/types/common';
import { getStore, initializeStore } from '@/redux/store';
import * as types from './types';

const dispatchAction = (action: { type: string; payload?: unknown }) => {
  const store = getStore() ?? initializeStore();
  store.dispatch(action);
  return action;
};

export const showLoader = (payload: boolean) => dispatchAction({ type: types.TOGGLE_LOADER, payload });

export const showAlert = (payload: AlertProps) => dispatchAction({ type: types.SET_ALERT, payload });

export const removeAlert = (payload: string) => dispatchAction({ type: types.REMOVE_ALERT, payload });

export const showDialog = (payload: {
  title?: string;
  description?: string;
  confirmButtonProps?: { label?: string; onClick?: () => void };
  rejectButtonProps?: { label?: string; onClick?: () => void };
}) => dispatchAction({ type: types.SET_DIALOG, payload });

export const closeDialog = () => dispatchAction({ type: types.SET_DIALOG, payload: undefined });

export const setUser = (payload: User) => dispatchAction({ type: types.SET_USER, payload });

export const setAppConfigs = (payload: IAppConfigs) => dispatchAction({ type: types.SET_APP_CONFIGS, payload });

export const showMessage = (payload: string) => dispatchAction({ type: types.SET_MESSAGE, payload });
