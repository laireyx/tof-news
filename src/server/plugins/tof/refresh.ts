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
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");

    fastify.decorate("tofRefresh", async function (): Promise<RefreshResult> {
      const expiredTime = Date.now() - +(env.LOOKUP_EXPIRE ?? "3600000");
      const startTime = Date.now();

      const cursor = collection?.find(
        {
          timestamp: { $lte: expiredTime },
        },
        { noCursorTimeout: true }
      );

      while (cursor?.hasNext()) {
        const record = await cursor.next();
        if (record) fastify.tofLookupByUid(record.uid);

        // Sleep 250ms.
        await new Promise((resolve) => setTimeout(() => resolve(null), 250));
      }

      return { success: true, time: Date.now() - startTime };
    });
  },
  {
    name: "tof/refresh",
  }
);
