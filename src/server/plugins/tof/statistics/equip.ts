import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../../tof/lookup";

type EquipStats = [number, number][];

type EquipAtkData = number;

declare module "fastify" {
  interface FastifyInstance {
    tofStatEquipments: () => Promise<EquipStats>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection =
      fastify.mongo.db?.collection<LookupRecord>("active-equipments");

    let atkResult: EquipAtkData[] = [];
    let lastChecked = 0;

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
                            {
                              $ne: ["$$this.element", "Superpower"],
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
          .forEach(({ attackOpts: { commonAtk, maxElemAtk } }) => {
            atkResult.push(commonAtk + maxElemAtk);
          });

        atkResult.sort((a, b) => a - b);
        atkResult = atkResult.filter(
          (_, i) =>
            i % ~~(atkResult.length / 99) === 0 || i === atkResult.length - 1
        );
      }

      return atkResult;
    });
  },
  {
    name: "tof/statistics/equip",
  }
);
