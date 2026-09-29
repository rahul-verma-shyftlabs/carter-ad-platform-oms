import { User } from 'types';
import { defaultConfigs, IAppConfigs } from '@/common/constants';
import { AlertProps, REDUX_ACTION } from '@/types/common';
import * as types from './types';

export interface ICommonState {
  loader: boolean;
  message: string;
  dialog?: {
    title?: string;
    description?: string;
    confirmButtonProps?: { label?: string; onClick?: () => void };
    rejectButtonProps?: { label?: string; onClick?: () => void };
  };
  alerts?: Array<AlertProps>;
  configs: IAppConfigs;
  user: User;
}

export interface IRootState {
  common: ICommonState;
}

const COMMON_INITIAL_STATE: ICommonState = {
  loader: false,
  message: '',
  configs: defaultConfigs,
  user: {},
  dialog: undefined,
  alerts: [],
};

const commonReducer = (state = COMMON_INITIAL_STATE, action: REDUX_ACTION): ICommonState => {
  switch (action.type) {
    case types.TOGGLE_LOADER:
      return { ...state, loader: action.payload };
    case types.SET_ALERT:
      return {
        ...state,
        alerts: [...(state.alerts || []), { ...action.payload, id: action.payload.id || `${Date.now()}` }],
      };
    case types.REMOVE_ALERT:
      return { ...state, alerts: (state.alerts || []).filter(alert => alert.id !== action.payload) };
    case types.SET_DIALOG:
      return { ...state, dialog: action.payload };
    case types.SET_USER:
      return { ...state, user: action.payload };
    case types.SET_APP_CONFIGS:
      return { ...state, configs: { ...state.configs, ...action.payload } };
    case types.SET_MESSAGE:
      return { ...state, message: action.payload };
    default:
      return state;
  }
};

const reducers = (state: IRootState = { common: COMMON_INITIAL_STATE }, action: REDUX_ACTION): IRootState => ({
  common: commonReducer(state.common, action),
});

export default reducers;
