import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../tof/lookup";

type RefreshResult = {
  success: boolean;
  time: number;
};

export default fp(
  async function (fastify, opts) {
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-users");

    const refreshInterval = +(env.REFRESH_INTERVAL ?? -1);

    const refresh = async function () {
      console.log("Refresh hit!");
      await collection
        ?.find()
        .sort({ timestamp: 1 })
        .limit(10)
        .forEach((record) => {
          fastify.tofLookupByUid(record.uid, record.server);
        });

      setTimeout(() => refresh(), refreshInterval);
    };

    console.log(
      `[@plugin/tof/refresh] User refresh plugin registered: ${refreshInterval}`
    );
    if (refreshInterval > 0) {
      refresh();
    }
  },
  {
    name: "tof/refresh",
    dependencies: ["tof/lookup"],
  }
);
