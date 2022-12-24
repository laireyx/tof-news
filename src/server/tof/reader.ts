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

  constructor(stream: Readable) {
    this.stream = stream;
  }

  get readableLength() {
    return this.stream.readableLength;
  }

  r32() {
    return this.stream.read(4) as Buffer | null;
  }

  skip() {
    this.stream.read();
  }

  readString(): string | undefined {
    let chunks: Buffer[] = [];
    let currentChunk = this.r32();

    if (!currentChunk) return undefined;

    while (currentChunk) {
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
  ): Partial<T> {
    const ret: Record<string, string | number | number[] | undefined> = {};

    opts.forEach((option) => {
      let readResult: string | number | number[] | undefined;
      switch (option.type) {
        case "str":
          readResult = this.readString() ?? undefined;
          break;
        case "uint":
          readResult = this.r32()?.readUint32LE() ?? undefined;
          break;
        case "uint[]":
          readResult = [];
          for (let i = 0; i < option.count; i++) {
            const eachNumber = this.r32()?.readUint32LE() ?? undefined;
            if (eachNumber === undefined) {
              readResult = undefined;
              break;
            }
            readResult.push(eachNumber);
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
