import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../tof/lookup";
import type { Collection } from "mongodb";

export default fp(
  async function (fastify, opts) {
    function refreshCollection(
      collection: Collection<LookupRecord> | undefined
    ) {
      const cb = async function () {
        await collection
          ?.find()
          .sort({ timestamp: 1 })
          .limit(10)
          .forEach((record) => {
            fastify.tofLookupByUid(record.uid, record.server);
          });

        setTimeout(() => cb(), refreshInterval);
      };

      return cb;
    }

    const activeUsers =
      fastify.mongo.db?.collection<LookupRecord>("active-users");
    const allUsers = fastify.mongo.db?.collection<LookupRecord>("lookup");

    const refreshInterval = +(env.REFRESH_INTERVAL ?? -1);

    const refreshActive = refreshCollection(activeUsers);
    const refreshAll = refreshCollection(allUsers);

    if (refreshInterval > 0) {
      await refreshActive();
      await refreshAll();

      console.log(
        `[@plugin/tof/refresh] User refresh plugin registered: ${refreshInterval}`
      );
    }
  },
  {
    name: "tof/refresh",
    dependencies: ["tof/lookup"],
  }
);
