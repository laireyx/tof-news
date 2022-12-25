class TofMessage {
  chunks: Buffer[];
  frozenChunks: Buffer[];
  frozen: boolean;

  constructor() {
    this.chunks = [];
    this.frozenChunks = [];
    this.frozen = false;
  }

  addBuffer(buf: Buffer) {
    this.chunks.push(buf);
    return this;
  }

  add(arr: number[]) {
    return this.addBuffer(Buffer.from(arr));
  }

  addString(str: string) {
    const strlen = Buffer.alloc(4);
    const strBuf = Buffer.from(str, "utf-8");

    strlen.writeUint32LE(strBuf.byteLength);
    this.chunks.push(
      strlen,
      strBuf,
      Buffer.from("\0".repeat(4 - (strBuf.byteLength & 3)))
    );
    return this;
  }

  addMsg(msg: TofMessage) {
    this.chunks.push(msg.build());
    return this;
  }

  freeze() {
    this.frozen = true;
    this.frozenChunks = this.frozenChunks.concat(this.chunks);
    this.chunks = [];
    return this;
  }

  build(excludeSize: boolean = true) {
    const msg = Buffer.concat(this.frozenChunks.concat(this.chunks));
    const msgLength = excludeSize ? msg.byteLength : msg.byteLength + 4;

    this.chunks = [];

    return Buffer.concat([Buffer.from([msgLength, 0x00, 0x00, 0x00]), msg]);
  }
}
export default TofMessage;
