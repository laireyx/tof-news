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
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-users");
    const statResult: { [key in PlayerStatKeys]?: number[] } = {};
    let lastChecked: Map<PlayerStatKeys, number> = new Map();

    fastify.decorate(
      "tofStatPlayer",
      async function (statName: PlayerStatKeys) {
        if (
          (lastChecked.get(statName) ?? -1) + +(env.STAT_EXPIRE ?? "600000") <
          Date.now()
        ) {
          lastChecked.set(statName, Date.now());

          statResult[statName] = [];

          const statKey = `data.player.${statName}`;

          let percentile = 0;

          await collection
            ?.aggregate([
              {
                $project: {
                  value: `$${statKey}`,
                },
              },
              {
                $bucketAuto: {
                  groupBy: "$value",
                  buckets: 100,
                  output: {
                    value: {
                      $push: "$value",
                    },
                  },
                },
              },
              {
                $project: {
                  value: { $arrayElemAt: ["$value", 0] },
                },
              },
            ])
            .forEach(({ value }) => {
              statResult[statName]?.push(value ?? 0);
              percentile++;
            });

          const [maxItem] =
            (await collection
              ?.find()
              .sort({ [statKey]: -1 })
              .limit(1)
              .toArray()) ?? [];

          if (maxItem) {
            statResult[statName]?.push(maxItem.data.player[statName] ?? 0);
          }
        }

        return statResult[statName];
      }
    );
  },
  {
    name: "tof/statistics/player",
  }
);
