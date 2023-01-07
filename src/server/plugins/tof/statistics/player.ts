import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord, PlayerStatKeys } from "../../../tof/lookup";

type PlayerStats = [number, number][];

declare module "fastify" {
  interface FastifyInstance {
    tofStatPlayer: (statName: PlayerStatKeys) => Promise<PlayerStats>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");
    const statResult: { [key in PlayerStatKeys]?: Map<number, number> } = {};
    let lastChecked: Map<PlayerStatKeys, number> = new Map();

    const activeLevelThreshold = +(env.ACTIVE_LEVEL_THRES ?? 0);

    fastify.decorate(
      "tofStatPlayer",
      async function (statName: PlayerStatKeys) {
        if (!statResult[statName]) statResult[statName] = new Map();

        if (
          (lastChecked.get(statName) ?? -1) + +(env.STAT_EXPIRE ?? "600000") <
          Date.now()
        ) {
          lastChecked.set(statName, Date.now());

          statResult[statName]?.clear();

          const statKey = `data.player.${statName}`;

          const maxLevelPlayers =
            (await collection?.countDocuments({
              level: { $gte: activeLevelThreshold },
            })) ?? 0;

          for (let percentile = 1; percentile <= 100; percentile++) {
            const idx = Math.min(
              (maxLevelPlayers * percentile) / 100,
              maxLevelPlayers - 1
            );

            const [theOne] =
              (await collection
                ?.find({ level: { $gte: activeLevelThreshold } })
                .sort({ [statKey]: 1 })
                .skip(idx)
                .limit(1)
                .toArray()) ?? [];

            statResult[statName]?.set(
              percentile,
              theOne.data.player[statName] ?? 0
            );
          }
        }

        return [...(statResult[statName]?.entries() ?? [])];
      }
    );
  },
  {
    name: "tof/statistics/player",
  }
);
