
export enum RouterStatus {
  OK = 200,
  PARTIAL_MATCH = 310,
  NOT_FOUND = 404,
  REDIRECT = 303,
}

export interface _IRouter {
  path: string;
  components?: React.FC<any>;
  redirect?: string;
  children?: _IRouter[];
}
export interface _IReductRouter {
  path: string;
  components?: React.FC<any>;
  redirect?: string;
  children?: { [key: string]: _IReductRouter };
}

export type TReductRouter = { [key: string]: _IReductRouter };
export type TRouter = _IRouter[];
