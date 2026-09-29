import { useMemo } from 'react';
import { applyMiddleware, createStore, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { REDUX_ACTION } from '@/types/common';
import reducers, { IRootState } from './reducers';

let store: Store<IRootState, REDUX_ACTION> | undefined;

export function initStore(initialState?: IRootState) {
  return createStore(reducers, initialState as any, applyMiddleware(thunkMiddleware));
}

export const initializeStore = (preloadedState?: IRootState) => {
  let _store = store ?? initStore(preloadedState);
  if (preloadedState && store) {
    _store = initStore({
      ...store.getState(),
      ...preloadedState,
    });
    store = undefined;
  }
  if (typeof window === 'undefined') return _store;
  if (!store) store = _store;
  return _store;
};

export function useStore(initialState?: IRootState) {
  return useMemo(() => initializeStore(initialState), [initialState]);
}

export const getStore = (): Store<IRootState, REDUX_ACTION> | undefined => store;
