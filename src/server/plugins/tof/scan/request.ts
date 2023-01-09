import { Servers, Server } from "../../../tof/servers";

function scanRequest(name: string, server: Server) {
  function padString(str: string) {
    const buf = Buffer.from(str, "utf-8");
    return Buffer.concat([
      buf,
      Buffer.from("\0".repeat(4 - (buf.byteLength & 3))),
    ]);
  }

  const padName = padString(name);
  const nameLength = padName.byteLength;

  return Buffer.concat([
    Buffer.from([0xc8 + nameLength, 0x00, 0x00, 0x00]),
    Buffer.from([
      0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0c, 0x00, 0x04, 0x00,
      0x00, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x70, 0x04, 0x00, 0x00,
    ]),
    Buffer.from([0xac + nameLength]),
    Buffer.from([
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x04,
      0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x0a,
      0x00, 0x00, 0x00, 0x39, 0x01, 0x00, 0x00,
    ]),
    Buffer.from([0x8c + nameLength]),
    Buffer.from([
      0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x30,
      0x00, 0x04, 0x00, 0x08, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x14, 0x00, 0x18,
      0x00, 0x1c, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x24, 0x00, 0x28,
      0x00, 0x2c, 0x00, 0x1e, 0x00, 0x00, 0x00,
    ]),
    Buffer.from([0x4c + nameLength]),
    Buffer.from([0x00, 0x00, 0x00, 0x61, 0xae, 0x0a, 0x00]),
    Buffer.from([0x30 + nameLength]),
    Buffer.from([0x00, 0x00, 0x00]),
    Buffer.from([0x0b + ~~(nameLength / 4)]),
    Buffer.from([
      0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x5a,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x15, 0x00, 0x00, 0x00, 0x0a,
      0x00, 0x00, 0x00, 0xe8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,
    ]),

    Buffer.from([Buffer.from(name, "utf-8").byteLength, 0x00, 0x00, 0x00]),
    padString(name),

    // Padding String: DummyAuthTicket
    Buffer.from([
      0x0f, 0x00, 0x00, 0x00, 0x44, 0x75, 0x6d, 0x6d, 0x79, 0x41, 0x75, 0x74,
      0x68, 0x54, 0x69, 0x63, 0x6b, 0x65, 0x74, 0x00, 0x11, 0x00, 0x00, 0x00,
    ]),
    padString(Servers[server].uid),
  ]);
}

export default scanRequest;