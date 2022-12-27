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

export { LookupByUidParams, LookupByNameParams, ScanParams, RefreshParams };
