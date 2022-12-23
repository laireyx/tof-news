export function padString(str: string) {
  const buf = Buffer.from(str, "utf-8");
  return Buffer.concat([
    buf,
    Buffer.from("\0".repeat(4 - (buf.byteLength & 3))),
  ]);
}
