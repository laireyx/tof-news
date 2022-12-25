import fp from "fastify-plugin";
import { env } from "process";
import {
  EquipmentOption,
  LookupRecord,
  LookupResponse,
  EquipmentOptionElement,
  EquipmentOptionValue,
  EquipmentOptionAdjust,
} from "../../tof/lookup";
import TofMessage from "../../tof/msg";
import TofReader from "../../tof/reader";
import TofSocket from "../../tof/socket";

declare module "fastify" {
  interface FastifyInstance {
    tofLookupByUid: (uid: string) => Promise<LookupResponse>;
    tofLookupByName: (nickname: string) => Promise<LookupResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    const LOOKUP = new TofMessage()
      .add([
        0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0c, 0x00, 0x04, 0x00,
        0x00, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x70, 0x04, 0x00, 0x00,
        0x68, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00,
        0x04, 0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x00, 0x00,
        0x0a, 0x00, 0x00, 0x00, 0x3f, 0x01, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00,
        0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x14, 0x00, 0x04, 0x00,
        0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00, 0x0e, 0x00, 0x00, 0x00,
        0x18, 0x00, 0x00, 0x00, 0x61, 0xae, 0x0a, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x8c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ])
      .freeze();

    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");

    fastify.decorate(
      "tofLookupByUid",
      async function (uid: string): Promise<LookupResponse> {
        const queryResult = await collection?.findOne({
          uid,
        });

        if (
          queryResult &&
          queryResult.timestamp + +(env.LOOKUP_EXPIRE ?? "3600000") > Date.now()
        )
          return { data: queryResult };

        const lookupSocket = new TofSocket();
        const reader = new TofReader(lookupSocket.socket);

        lookupSocket.on("readable", async () => {
          const msg = reader.readMessage();
          if (msg == null) return;

          const { name, uid } = msg.destruct<{
            name: string;
            uid: string;
          }>([
            { type: "uint[]", count: 29 },
            { type: "str" }, // Current Location
            { key: "name", type: "str" },
            { type: "str" },
            { key: "uid", type: "str" },
          ]);

          if (!name || !uid || uid?.length !== 17) {
            return;
          }

          const record: LookupRecord = {
            uid,
            name,
            timestamp: Date.now(),
            data: {
              weapons: [],
              equipments: [],
            },
          };

          while (true) {
            let strlen = msg.readInt();
            while (strlen !== 0x0d) {
              if (strlen === undefined) {
                return;
              }
              strlen = msg.readInt();
            }
            const str = msg
              .readSize(0x10)
              ?.subarray(0, 0x0d)
              ?.toString("utf-8");
            if (str === "OfflineMoment") break;
          }

          for (let i = 0; i < 100; i++) {
            const { mountStr, mountType } = msg.destruct<{
              mountStr: string;
              mountType: string;
            }>([
              { type: "uint[]", count: 6 },
              { key: "mountStr", type: "str" },
              { key: "mountType", type: "str" },
            ]);

            if (!mountStr || !mountType) break;

            if (mountType.startsWith("Weapon_")) {
              const matchResult = mountStr.match(
                /(.+)#\d+##(\d+)#&&(\d+):(\d+):\d+/
              );
              if (matchResult) {
                const [_, name, level, stars] = matchResult;

                record.data.weapons.push({
                  name,
                  level: +level,
                  stars: +stars,
                });
              }
            } else if (mountType.startsWith("Equipment_")) {
              const matchResult = mountStr.match(/(.+)#(\d+)#(.+)*#(\d+)#/);
              if (matchResult) {
                const [_, partString, level, optionsStr, stars] = matchResult;

                const options = optionsStr
                  .split("|")
                  .map((eachOption): EquipmentOption => {
                    const [optionType, optionAmount] = eachOption.split(";");

                    const match = optionType
                      .slice(2)
                      .match(
                        /(Common|Element|Phy|Thunder|Fire|Ice|Superpower)?(Atk|Def|MaxHealth|Crit)(Added|Mult|ExtraUpMult)?/
                      );

                    if (match) {
                      const [_, element, value, adjust] = match as [
                        any,
                        EquipmentOptionElement,
                        EquipmentOptionValue,
                        EquipmentOptionAdjust
                      ];

                      return {
                        element,
                        value,
                        adjust: adjust ?? "Added", // ElementDef does not come with Added
                        amount: optionAmount.slice(2),
                      };
                    }

                    return {};
                  });

                record.data.equipments.push({
                  part: partString,
                  level: +level,
                  options: options,
                  stars: +stars,
                });
              }
            }
          }

          const existingUser = await collection?.findOne({ name });

          // There already exists user with same name.
          // Update that user.
          // 일종의 밀어내기식 업데이트
          if (existingUser && existingUser.uid !== uid) {
            fastify.tofLookupByUid(uid);
          }

          await collection?.updateOne(
            { uid: uid },
            { $set: record },
            { upsert: true }
          );
        });

        lookupSocket.send(LOOKUP.addString(uid).build());

        return { queued: true };
      }
    );

    fastify.decorate(
      "tofLookupByName",
      async function (name: string): Promise<LookupResponse> {
        const queryResult = await collection?.findOne({
          name,
        });

        if (
          queryResult &&
          queryResult.timestamp + +(env.LOOKUP_EXPIRE ?? "3600000") > Date.now()
        )
          return { data: queryResult };
        else if (queryResult) {
          return await fastify.tofLookupByUid(queryResult.uid);
        }

        return await fastify.tofScan(name);
      }
    );
  },
  {
    name: "tof/lookup",
  }
);
