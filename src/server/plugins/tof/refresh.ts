import fp from "fastify-plugin";
import { LookupRecord } from "../../tof/lookup";
import { Server } from "../../tof/servers";

type RefreshResult = {
  success: boolean;
  time: number;
};

declare module "fastify" {
  interface FastifyInstance {
    tofRefresh: (server: Server) => Promise<RefreshResult>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");

    fastify.decorate(
      "tofRefresh",
      async function (server: Server): Promise<RefreshResult> {
        const startTime = Date.now();

        await collection
          ?.find()
          .sort({ timestamp: 1 })
          .limit(20)
          .forEach((record) => {
            fastify.tofLookupByUid(record.uid, server);
          });

        return { success: true, time: Date.now() - startTime };
      }
    );
  },
  {
    name: "tof/refresh",
  }
);
