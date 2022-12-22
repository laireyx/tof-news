type StructType = "str" | "uint" | "uint[]";

type DestructOption =
  | {
      key?: string;
      type: Exclude<StructType, "uint[]">;
    }
  | {
      key?: string;
      type: Extract<StructType, "uint[]">;
      count: number;
    };

export { DestructOption };
