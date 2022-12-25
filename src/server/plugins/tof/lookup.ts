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
import TofReader from "../../tof/reader";
import TofSocket from "../../tof/socket";
import { padString } from "../../tof/util";

declare module "fastify" {
  interface FastifyInstance {
    tofLookupByUid: (uid: string) => Promise<LookupResponse>;
    tofLookupByName: (nickname: string) => Promise<LookupResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    const LOOKUP = Buffer.from([
      0x84, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00,
      0x0c, 0x00, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x0a, 0x00, 0x00, 0x00,
      0x70, 0x04, 0x00, 0x00, 0x68, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
      0x0c, 0x00, 0x10, 0x00, 0x04, 0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00,
      0x0c, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x3f, 0x01, 0x00, 0x00,
      0x48, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00,
      0x14, 0x00, 0x04, 0x00, 0x08, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x10, 0x00,
      0x0e, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x61, 0xae, 0x0a, 0x00,
      0x08, 0x00, 0x00, 0x00, 0x8c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x00, 0x00, 0x00,
    ]);

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

        lookupSocket.on("readable", async () => {
          const reader = new TofReader(lookupSocket.socket);

          // Consume Server Hello
          if (reader.readableLength <= 340) {
            reader.skip();
            return;
          }

          const { name, uid } = reader.destruct<{
            name: string;
            uid: string;
          }>([
            { type: "uint[]", count: 31 },
            { type: "str" }, // Current Location
            { type: "uint" },
            { key: "name", type: "str" },
            { type: "uint" },
            { type: "str" },
            { type: "uint" },
            { key: "uid", type: "str" },
          ]);

          if (!name || !uid || uid?.length !== 17) {
            lookupSocket.socket.end();
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

          let str = reader.readString();
          while (str !== "OfflineMoment") {
            if (str === undefined) {
              lookupSocket.socket.end();
              return;
            }
            str = reader.readString();
          }

          for (let i = 0; i < 100; i++) {
            const { mountStr, mountType } = reader.destruct<{
              mountStr: string;
              mountType: string;
            }>([
              { type: "uint[]", count: 7 },
              { key: "mountStr", type: "str" },
              { type: "uint" },
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

          lookupSocket.socket.end();
        });

        lookupSocket.send(Buffer.concat([LOOKUP, padString(uid)]));

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
