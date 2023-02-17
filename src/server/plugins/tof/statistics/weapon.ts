import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../../tof/lookup";

type WeaponStats = [string, number][];

declare module "fastify" {
  interface FastifyInstance {
    tofStatWeapons: () => Promise<WeaponStats>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-users");
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
