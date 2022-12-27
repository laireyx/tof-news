import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord, WeaponStat } from "../../../tof/lookup";

type WeaponStatistics = [string, number][];

declare module "fastify" {
  interface FastifyInstance {
    tofStatWeapons: () => Promise<WeaponStatistics>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");
    const statResult: Map<string, number> = new Map();
    let lastChecked = 0;

    fastify.decorate("tofStatWeapons", async function () {
      if (lastChecked + +(env.STAT_EXPIRE ?? "600000") < Date.now()) {
        lastChecked = Date.now();
        statResult.clear();

        await collection?.find().forEach(({ data: { weapons } }) => {
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
