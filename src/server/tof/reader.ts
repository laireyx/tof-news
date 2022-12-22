import { Readable } from "stream";

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

class TofReader {
  stream: Readable;

  constructor(data: Buffer | null) {
    this.stream = new Readable();
    this.stream._read = () => {};
    this.stream.push(data);
    this.stream.push(null);
  }

  private r32() {
    return this.stream.read(4) as Buffer | null;
  }

  skip(size: number) {
    this.stream.read(size);
    return this.stream.readable;
  }

  readString(): string | null {
    let chunks: Buffer[] = [];
    let currentChunk = this.r32();

    if (currentChunk === null) return null;

    while (currentChunk !== null) {
      const terminal = currentChunk.findIndex((byte) => byte === 0);

      if (terminal !== -1) {
        if (terminal > 0) chunks.push(currentChunk.subarray(0, terminal));
        break;
      }

      chunks.push(currentChunk);
      currentChunk = this.r32();
    }

    return Buffer.concat(chunks).toString("utf-8");
  }

  destruct<T extends Record<string, string | number | number[]>>(
    opts: DestructOption[]
  ): T {
    const ret: Record<string, string | number | number[]> = {};

    opts.forEach((option) => {
      let readResult: string | number | number[];
      switch (option.type) {
        case "str":
          readResult = this.readString() ?? "";
          break;
        case "uint":
          readResult = this.r32()?.readUint32LE() ?? 0;
          break;
        case "uint[]":
          readResult = [];
          for (let i = 0; i < option.count; i++) {
            readResult.push(this.r32()?.readUint32LE() ?? 0);
          }
          break;
      }

      if (option.key) {
        ret[option.key] = readResult;
      }
    });

    return ret as T;
  }
}

export default TofReader;
