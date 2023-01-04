import fp from "fastify-plugin";
import { TofReader } from "../../../tof/reader";
import { Server } from "../../../tof/servers";
import TofSocket from "../../../tof/socket";
import scanRequest from "./request";

type ScanResponse = {
  queued: boolean;
};
declare module "fastify" {
  interface FastifyInstance {
    tofScan: (uid: string, server: Server) => Promise<ScanResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    fastify.decorate(
      "tofScan",
      async function (name: string, server: Server): Promise<ScanResponse> {
        const scanSocket = new TofSocket(server);
        const reader = new TofReader(scanSocket.socket);

        scanSocket.on("readable", () => {
          const msg = reader.readMessage();
          if (msg == null) return;

          for (;;) {
            const test = msg.readInt();

            if (test === undefined) {
              return;
            }
            if (test === 8) break;
          }

          // Skip 4bytes.
          msg.destruct([{ type: "uint" }]);

          for (let i = 0; i < 100; i++) {
            const { name, uid } = msg.destruct<{
              name: string;
              uid: string;
            }>([
              { type: "str", key: "name" },
              { type: "str", key: "uid" },
              { type: "uint[]", count: 8 },
            ]);

            if (!name || !uid) break;

            console.log("Scan result: ", name, uid);
            if (uid.length !== 17) {
              return;
            }
            fastify.tofLookupByUid(uid, server);
          }
        });

        scanSocket.send(scanRequest(name, server));

        return { queued: true };
      }
    );
  },
  {
    name: "tof/scan",
  }
);
