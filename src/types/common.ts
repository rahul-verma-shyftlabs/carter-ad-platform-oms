import { NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';
import { SnackbarProps } from 'shyftlabs-dsl';

export type REDUX_ACTION = {
  type: string;
  payload?: any;
};

export type PageType = ReactElement | ReactElement[];

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  getLayout?: (page: PageType) => ReactNode;
};

export type AlertProps = SnackbarProps & { autoCloseDuration?: number; id?: string };
