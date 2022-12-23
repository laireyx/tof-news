import fp from "fastify-plugin";
import { env } from "process";
import {
  EquipmentOption,
  LookupRecord,
  LookupResponse,
} from "../../tof/lookup";
import TofQueue from "../../tof/queue";
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

    const lookupSocket = new TofSocket();
    const lookupQueue = new TofQueue<string>({
      size: +(env.LOOKUP_QUEUE || "100"),
      task: (uid) => lookupSocket.send(Buffer.concat([LOOKUP, padString(uid)])),
    });

    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");

    lookupSocket.on("reconnect", () => {
      lookupQueue.next();
    });

    lookupSocket.on("readable", async () => {
      const data = lookupSocket.recv();
      const reader = new TofReader(data);

      if (!data) return;

      const { name, uid } = reader.destruct<{ name: string; uid: string }>([
        { type: "uint[]", count: 31 },
        { type: "str" },
        { type: "uint" },
        { key: "name", type: "str" },
        { type: "uint" },
        { type: "str" },
        { type: "uint" },
        { key: "uid", type: "str" },
      ]);

      if (name === "" || uid === "") return;

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
      while (str !== "MountRoleInfo") {
        if (str === null) return;
        str = reader.readString();
      }

      reader.skip(28);

      for (let i = 0; i < 3; i++) {
        const { weaponStr } = reader.destruct<{ weaponStr: string }>([
          { key: "weaponStr", type: "str" },
          { type: "uint[]", count: 11 },
        ]);

        const matchResult = weaponStr.match(
          /(.+)#\d+##(\d+)#&&(\d+):(\d+):\d+/
        );
        if (matchResult) {
          const [_, name, level, stars] = matchResult;

          record.data.weapons.push({ name, level: +level, stars: +stars });
        }
      }

      for (let i = 0; i < 20; i++) {
        const { equipStr } = reader.destruct<{ equipStr: string }>([
          { key: "equipStr", type: "str" },
          { type: "uint" },
          { type: "str" },
          { type: "uint[]", count: 7 },
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
      }

      const existingUser = await collection?.findOne({ name });

      // There already exists user with same name.
      // Update that user.
      // 일종의 밀어내기식 업데이트
      if (existingUser && existingUser.uid !== uid) {
        lookupQueue.enqueue(uid);
      }

      await collection?.updateOne(
        { uid: uid },
        { $set: record },
        { upsert: true }
      );

      lookupQueue.next();
    });

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

        const queued = lookupQueue.enqueue(uid);
        return { queued, num: lookupQueue.length };
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

        return await fastify.tofScan(name);
      }
    );
  },
  {
    name: "tof/lookup",
  }
);
