export function padString(str: string) {
  return Buffer.concat([
    Buffer.from(str),
    Buffer.from("\0".repeat(4 - (str.length & 3))),
  ]);
}
