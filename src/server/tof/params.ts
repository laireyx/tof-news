import { Server } from "./servers";

type LookupByUidParams = { uid: string };
type LookupByUidQuery = { server: Server };

type LookupByNameParams = { name: string };
type LookupByNameQuery = { server: Server };

type ScanParams = { name: string };
type ScanQuery = { server: Server };

type RefreshQuery = {
  token: string;
};

type NametagParams = {
  uid: string;
};

export {
  LookupByUidParams,
  LookupByUidQuery,
  LookupByNameParams,
  LookupByNameQuery,
  ScanParams,
  ScanQuery,
  RefreshQuery,
  NametagParams,
};
