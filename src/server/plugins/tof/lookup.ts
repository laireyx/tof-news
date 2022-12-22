import fp from "fastify-plugin";
import { env } from "process";
import {
  EquipmentOption,
  LookupRecord,
  LookupResponse,
} from "../../tof/lookup";
import TofReader from "../../tof/reader";
import TofSocket from "../../tof/socket";

declare module "fastify" {
  interface FastifyInstance {
    tofLookup: (uid: string) => Promise<LookupResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    const lookupSocket = new TofSocket();
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

    lookupSocket.on("readable", () => {
      const data = lookupSocket.recv();
      const reader = new TofReader(data);

      if (!data) return;

      reader.skip(124);
      reader.readString(); // Location: ex. Vera_City or QRSL_P
      reader.skip(44);

      const uid = reader.readString();
      if (!uid) return;

      const record: LookupRecord = {
        uid,
        timestamp: Date.now(),
        data: {
          weapons: [],
          equipments: [],
        },
      };

      let str = reader.readString();
      while (str !== "MountRoleInfo") {
        if (str === null) return;
        str = reader.readString();
      }

      reader.skip(28);

      for (let i = 0; i < 3; i++) {
        const { weaponStr } = reader.destruct<{ weaponStr: string }>([
          { key: "weaponStr", type: "str" },
        ]);

        const matchResult = weaponStr.match(
          /(.+)#\d+##(\d+)#&&(\d+):(\d+):\d+/
        );
        if (matchResult) {
          const [_, name, level, stars] = matchResult;

          record.data.weapons.push({ name, level: +level, stars: +stars });
        }
        reader.skip(44);
      }

      for (let i = 0; i < 20; i++) {
        const { equipStr } = reader.destruct<{ equipStr: string }>([
          { key: "equipStr", type: "str" },
        ]);

        const matchResult = equipStr.match(/(.+)#(\d+)#(.+)*#(\d+)#/);
        if (matchResult) {
          const [_, partString, level, optionsStr, stars] = matchResult;

          const options = optionsStr
            .split("|")
            .map<EquipmentOption>((eachOption) => {
              const [optionType, optionAmount] = eachOption.split(";");

              return {
                type: optionType.slice(2),
                amount: optionAmount.slice(2),
              };
            });

          record.data.equipments.push({
            part: partString,
            level: +level,
            options: options,
            stars: +stars,
          });
        } else break;

        reader.destruct([
          { type: "uint" },
          { type: "str" },
          { type: "uint[]", count: 7 },
        ]);
      }

      collection?.updateOne({ uid: uid }, { $set: record }, { upsert: true });
    });

    fastify.decorate(
      "tofLookup",
      async function (uid: string): Promise<LookupResponse> {
        const queryResult = await collection?.findOne({
          uid,
        });
        if (
          queryResult &&
          queryResult.timestamp + +(env.LOOKUP_LIMIT ?? "3600000") > Date.now()
        )
          return { success: true, data: queryResult };

        lookupSocket.send(
          Buffer.concat([LOOKUP, Buffer.from(uid + "\0\0\0", "utf-8")])
        );
        return { success: false };
      }
    );
  },
  {
    name: "tof/lookup",
  }
);
