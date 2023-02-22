import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../../tof/lookup";
import TofRequestBuilder from "../../../tof/req-builder";
import { TofReader } from "../../../tof/reader";
import TofSocket from "../../../tof/socket";
import TofUserResponse from "./response";
import { Server } from "../../../tof/servers";
import { calculateActualAtk } from "./utils";

type LookupResponse = {
  queued?: boolean;
  num?: number;
  data?: LookupRecord;
};

declare module "fastify" {
  interface FastifyInstance {
    tofLookupByUid: (uid: string, server: Server) => Promise<LookupResponse>;
    tofLookupByName: (
      nickname: string,
      server: Server
    ) => Promise<LookupResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    const LOOKUP = new TofRequestBuilder()
      .add([
        0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0c, 0x00, 0x04, 0x00,
        0x00, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x70, 0x04, 0x00, 0x00,
        0x68, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00,
        0x04, 0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x00, 0x00,
        0x0a, 0x00, 0x00, 0x00, 0x3f, 0x01, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00,
        0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x14, 0x00, 0x04, 0x00,
        0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x0e, 0x00, 0x00, 0x00,
        0x18, 0x00, 0x00, 0x00, 0x61, 0xae, 0x0a, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x8c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ])
      .freeze();

    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");

    fastify.decorate(
      "tofLookupByUid",
      async function (uid: string, server: Server): Promise<LookupResponse> {
        let resolve: (resp: LookupResponse) => void;
        let reject: (reason: any) => void;

        const returnPromise = new Promise<LookupResponse>(
          (_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
          }
        );

        const queryResult = await collection?.findOne({
          uid,
        });

        if (
          queryResult &&
          queryResult.timestamp + +(env.LOOKUP_EXPIRE ?? "3600000") > Date.now()
        )
          return { data: queryResult };

        const lookupSocket = new TofSocket(server);
        const reader = new TofReader(lookupSocket.socket);

        lookupSocket.on("readable", async () => {
          const rawMsg = reader.readMessage();
          if (rawMsg == null) return;

          const msg = new TofUserResponse(rawMsg);

          const { name, uid } = msg.extractUserInfo();

          if (!name || !uid || uid?.length !== 17) {
            return;
          }

          const record: LookupRecord = {
            uid,
            name,
            server,

            inGameUid: "",
            level: 0,
            battleStrength: 0,

            timestamp: Date.now(),
            data: {
              player: {},
              weapons: [],
              equipments: [],
            },
          };

          if (!msg.skipUntilMountInfo()) return;

          for (let i = 0; i < 512; i++) {
            // Skip unneccessary 4B.
            msg.readInt();
            // This is chunk type.
            const chunkType = msg.readInt();

            if (chunkType === 0x01000000) {
              msg.readIntChunk(record);
            } else if (chunkType === 0x03000000) {
              msg.readI64Chunk(record);
            } else if (chunkType === 0x06000000) {
              msg.readStringChunk(record);
            } else if (chunkType === 0x08000000) {
              msg.readFloatChunk(record);
            } else {
              msg.skipChunk();
            }
          }

          calculateActualAtk(record);

          const existingUser = await collection?.findOne({ name, server });

          // There already exists user with same name.
          // Update that user.
          // 일종의 밀어내기식 업데이트
          if (existingUser && existingUser.uid !== uid) {
            fastify.tofLookupByUid(uid, server);
          }

          await collection?.updateOne(
            { uid: uid },
            { $set: record },
            { upsert: true }
          );

          resolve({ data: record });
        });

        lookupSocket.send(LOOKUP.addString(uid).build());
        lookupSocket.on("invalidate", () =>
          reject({ status: 500, reason: "Internel Server Error" })
        );
        return returnPromise;
      }
    );

    fastify.decorate(
      "tofLookupByName",
      async function (name: string, server: Server): Promise<LookupResponse> {
        const queryResult = await collection?.findOne({
          name,
          server,
        });

        if (
          queryResult &&
          queryResult.timestamp + +(env.LOOKUP_EXPIRE ?? "3600000") > Date.now()
        )
          return { data: queryResult };
        else if (queryResult) {
          return await fastify.tofLookupByUid(queryResult.uid, server);
        }

        return await fastify.tofScan(name, server);
      }
    );
  },
  {
    name: "tof/lookup",
  }
);
