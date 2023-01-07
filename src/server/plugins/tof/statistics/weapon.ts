import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord, WeaponStat } from "../../../tof/lookup";

type WasponStats = [string, number][];

declare module "fastify" {
  interface FastifyInstance {
    tofStatWeapons: () => Promise<WasponStats>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");
    const statResult: Map<string, number> = new Map();
    let lastChecked = 0;

    const activeLevelThreshold = +(env.ACTIVE_LEVEL_THRES ?? 0);

    fastify.decorate("tofStatWeapons", async function () {
      if (lastChecked + +(env.STAT_EXPIRE ?? "600000") < Date.now()) {
        lastChecked = Date.now();
        statResult.clear();

        await collection
          ?.find({ level: { $gte: activeLevelThreshold } })
          .forEach(({ data: { weapons } }) => {
            const names = weapons
              .map(({ name }) => name)
              .sort()
              .join(";");

            const count = statResult.get(names) ?? 0;
            statResult.set(names, count + 1);
          });
      }

      return [...statResult.entries()];
    });
  },
  {
    name: "tof/statistics/weapon",
  }
);
