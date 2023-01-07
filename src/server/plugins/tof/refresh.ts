import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../tof/lookup";

type RefreshResult = {
  success: boolean;
  time: number;
};

declare module "fastify" {
  interface FastifyInstance {
    tofRefresh: () => Promise<RefreshResult>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-users");

    fastify.decorate("tofRefresh", async function (): Promise<RefreshResult> {
      const startTime = Date.now();

      await collection
        ?.find()
        .sort({ timestamp: 1 })
        .limit(20)
        .forEach((record) => {
          fastify.tofLookupByUid(record.uid, record.server);
        });

      return { success: true, time: Date.now() - startTime };
    });
  },
  {
    name: "tof/refresh",
  }
);
