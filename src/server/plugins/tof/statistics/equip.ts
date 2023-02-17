import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../../tof/lookup";

type EquipStats = [string, number][];

type EquipAtkData = number;

declare module "fastify" {
  interface FastifyInstance {
    tofStatEquipments: (atk: number) => Promise<EquipStats>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-equipments");

    let atkResult: EquipAtkData[] = [];
    let lastChecked = 0;

    function getRank(atk: number) {
      let low = 0,
        high = atkResult.length - 1;
      while (atk != atkResult[(low + high) >> 1]) {
        if (atk < atkResult[(low + high) >> 1]) {
          high = ((low + high) >> 1) - 1;
        } else {
          low = ((low + high) >> 1) + 1;
        }
      }

      return (low + high) >> 1;
    }

    fastify.decorate("tofStatEquipments", async function (atk: number) {
      if (lastChecked + +(env.STAT_EXPIRE ?? "600000") < Date.now()) {
        lastChecked = Date.now();

        await collection
          ?.aggregate([
            {
              $project: {
                _id: 0,
                attackOpts: {
                  $reduce: {
                    input: {
                      $filter: {
                        input: "$equipments.options",
                        cond: {
                          $and: [
                            {
                              $eq: ["$$this.value", "Atk"],
                            },
                            {
                              $eq: ["$$this.adjust", "Added"],
                            },
                          ],
                        },
                      },
                    },
                    initialValue: { commonAtk: 0, maxElemAtk: 0 },
                    in: {
                      $cond: {
                        if: {
                          $eq: ["$$this.element", "Common"],
                        },
                        then: {
                          commonAtk: {
                            $max: [
                              "$$value.commonAtk",
                              { $toDouble: "$$this.amount" },
                            ],
                          },
                          maxElemAtk: "$$value.maxElemAtk",
                        },
                        else: {
                          commonAtk: "$$value.commonAtk",
                          maxElemAtk: {
                            $max: [
                              "$$value.maxElemAtk",
                              { $toDouble: "$$this.amount" },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ])
          .forEach((doc) => {
            atkResult.push(doc.commonAtk + doc.maxElemAtk);
          });

        atkResult.sort((a, b) => a - b);
      }

      return getRank(atk);
    });
  },
  {
    name: "tof/statistics/equip",
  }
);
