import fp from "fastify-plugin";
import { env } from "process";
import { ScanResponse } from "../../tof/scan";
import TofReader from "../../tof/reader";
import TofSocket from "../../tof/socket";
import { padString } from "../../tof/util";

declare module "fastify" {
  interface FastifyInstance {
    tofScan: (uid: string) => Promise<ScanResponse>;
  }
}

function scanPacket(name: string) {
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
    padString("42945816079448220"),
  ]);
}

export default fp(
  async function (fastify, opts) {
    const scanSocket = new TofSocket();

    fastify.decorate(
      "tofScan",
      async function (name: string): Promise<ScanResponse> {
        scanSocket.on("readable", () => {
          const reader = new TofReader(scanSocket.socket);

          // Consume Server Hello
          if (reader.readableLength === 340) {
            reader.skip();
            return;
          }

          for (;;) {
            const test = reader.r32()?.readUint32LE() ?? undefined;

            if (test === undefined) {
              scanSocket.socket.end();
              return;
            }
            if (test === 8) break;
          }

          // Skip 4bytes.
          reader.destruct([{ type: "uint" }]);

          for (let i = 0; i < 100; i++) {
            const { name, uid } = reader.destruct<{
              name: string;
              uid: string;
            }>([
              { type: "uint" }, // strlen(name)
              { type: "str", key: "name" },
              { type: "uint" }, // strlen(uid)
              { type: "str", key: "uid" },
              { type: "uint[]", count: 8 },
            ]);

            if (!name || !uid) break;

            console.log("Scan result: ", name, uid);
            if (uid.length !== 17) {
              scanSocket.socket.end();
              return;
            }
            fastify.tofLookupByUid(uid);
          }

          scanSocket.socket.end();
        });

        scanSocket.send(scanPacket(name));

        return { queued: true };
      }
    );
  },
  {
    name: "tof/scan",
  }
);
