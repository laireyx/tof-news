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

class TofResponse {
  buffer: Buffer;
  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  readInt() {
    if (this.buffer.byteLength < 4) return undefined;

    const int = this.buffer.readUint32LE();
    this.buffer = this.buffer.subarray(4);

    return int;
  }

  readString() {
    const strlen = this.readInt();
    if (strlen === undefined || this.buffer.byteLength < strlen)
      return undefined;

    const str = this.buffer.subarray(0, strlen).toString("utf-8");
    this.buffer = this.buffer.subarray(strlen + (4 - (strlen & 0x03)));

    return str;
  }

  readSize(size: number) {
    if (this.buffer.byteLength < size) return undefined;

    const buf = this.buffer.subarray(0, size);
    this.buffer = this.buffer.subarray(size);

    return buf;
  }

  destruct<T extends Record<string, string | number | number[]>>(
    opts: DestructOption[]
  ): Partial<T> {
    const ret: Record<string, string | number | number[] | undefined> = {};

    opts.forEach((option) => {
      let readResult: string | number | number[] | undefined;
      switch (option.type) {
        case "str":
          readResult = this.readString();
          break;
        case "uint":
          readResult = this.readInt();
          break;
        case "uint[]":
          readResult = [];
          for (let i = 0; i < option.count; i++) {
            const eachNumber = this.readInt() ?? 0;
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

class TofReader {
  stream: Readable;
  waitingLength: number;

  constructor(stream: Readable) {
    this.stream = stream;
    this.waitingLength = -1;
  }

  r32() {
    return this.stream.read(4) as Buffer | null;
  }

  i32() {
    const r32Result = this.r32();
    return r32Result?.readUint32LE() ?? null;
  }

  read() {
    if (this.waitingLength === -1) {
      this.waitingLength = this.i32() ?? -1;

      if (this.waitingLength === -1) return null;
    }

    if (this.stream.readableLength < this.waitingLength) return null;

    const readResult = this.stream.read(this.waitingLength) as Buffer | null;
    if (readResult == null) return null;

    this.waitingLength = -1;
    return readResult;
  }

  readMessage() {
    const readResult = this.read();
    if (readResult == null) return null;

    return new TofResponse(readResult);
  }
}

export { TofReader, TofResponse };
