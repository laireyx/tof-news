type LookupByUidParams = { uid: string };
type LookupByUidQuery = { server: string };

type LookupByNameParams = { name: string };
type LookupByNameQuery = { server: string };

type ScanParams = { name: string };
type ScanQuery = { server: string };

type RefreshQuery = {
  token: string;
  server: string;
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
