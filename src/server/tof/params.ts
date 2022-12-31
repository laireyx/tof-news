type LookupByUidParams = {
  uid: string;
};

type LookupByNameParams = {
  name: string;
};

type ScanParams = {
  nickname: string;
};

type RefreshParams = {
  token: string;
};

type NametagParams = {
  uid: string;
};

export {
  LookupByUidParams,
  LookupByNameParams,
  ScanParams,
  RefreshParams,
  NametagParams,
};
