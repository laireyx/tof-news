import fp from "fastify-plugin";
import { env } from "node:process";
import {
  EquipmentOption,
  LookupRecord,
  EquipmentOptionElement,
  EquipmentOptionValue,
  EquipmentOptionAdjust,
} from "../../tof/lookup";
import TofMessageBuilder from "../../tof/msg";
import { TofReader, TofMessage } from "../../tof/reader";
import TofSocket from "../../tof/socket";

type LookupResponse = {
  queued?: boolean;
  num?: number;
  data?: LookupRecord;
};

declare module "fastify" {
  interface FastifyInstance {
    tofLookupByUid: (uid: string) => Promise<LookupResponse>;
    tofLookupByName: (nickname: string) => Promise<LookupResponse>;
  }
}

class TofUserMessage extends TofMessage {
  constructor(msg: TofMessage) {
    super(msg.buffer);
  }

  extractUserInfo() {
    return this.destruct<{
      name: string;
      uid: string;
    }>([
      { type: "uint[]", count: 29 },
      { type: "str" }, // Current Location
      { key: "name", type: "str" },
      { type: "str" },
      { key: "uid", type: "str" },
    ]);
  }

  skipUntilMountInfo() {
    while (true) {
      let strlen = this.readInt();
      while (strlen !== 0x0d) {
        if (strlen === undefined) {
          return false;
        }
        strlen = this.readInt();
      }
      const str = this.readSize(0x10)?.subarray(0, 0x0d)?.toString("utf-8");
      if (str === "OfflineMoment") break;
    }
    return true;
  }

  readI64Chunk(record: LookupRecord) {
    const chunkSize = this.readInt() ?? 0;
    const i64Buffer = this.readSize(chunkSize - 4);
    const i64Type = this.readString();

    if (!i64Buffer || !i64Type) return;

    const offset = i64Buffer.readUint32LE(0) + 4;

    if (i64Type === "uid") {
      const user = i64Buffer.readUint32LE(offset);
      const server = i64Buffer.readUint32LE(offset + 4);
      record.inGameUid = `${server}${user}`;
    }
  }

  readIntChunk(record: LookupRecord) {
    const chunkSize = this.readInt() ?? 0;
    const intBuffer = this.readSize(chunkSize - 4);
    const intType = this.readString();

    if (!intBuffer || !intType) return;

    if (intType === "level") {
      record.level = intBuffer.readUint32LE(intBuffer.length - 4);
    }
    if (intType === "BattleStrengthScore") {
      record.battleStrength = intBuffer.readUint32LE(intBuffer.length - 4);
    }
  }

  readStringChunk(record: LookupRecord) {
    const { strData, strType } = this.destruct<{
      strData: string;
      strType: string;
    }>([
      { type: "uint[]", count: 4 },
      { key: "strData", type: "str" },
      { key: "strType", type: "str" },
    ]);

    if (!strData || !strType) return;

    if (strType.startsWith("Weapon_")) {
      const matchResult = strData.match(/(.+)#\d+##(\d+)#&&(\d+):(\d+):\d+/);
      if (matchResult) {
        const [_, name, level, stars] = matchResult;

        record.data.weapons.push({
          name,
          level: +level,
          stars: +stars,
        });
      }
    } else if (strType.startsWith("Equipment_")) {
      const matchResult = strData.match(/(.+)#(\d+)#(.+)*#(\d+)#/);
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
    } else if (strType === "GuildName") {
      record.guildName = strData;
    }
  }

  skipChunk() {
    const chunkSize = this.readInt() ?? 0;
    this.readSize(chunkSize - 4);
    this.readString();
  }
}

export default fp(
  async function (fastify, opts) {
    const LOOKUP = new TofMessageBuilder()
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
          const rawMsg = reader.readMessage();
          if (rawMsg == null) return;

          const msg = new TofUserMessage(rawMsg);

          const { name, uid } = msg.extractUserInfo();

          if (!name || !uid || uid?.length !== 17) {
            return;
          }

          const record: LookupRecord = {
            uid,
            name,

            inGameUid: "",
            level: 0,
            battleStrength: 0,

            timestamp: Date.now(),
            data: {
              weapons: [],
              equipments: [],
            },
          };

          if (!msg.skipUntilMountInfo()) return;

          for (let i = 0; i < 256; i++) {
            // Skip unneccessary 4B.
            msg.readInt();
            // This is chunk type.
            const chunkType = msg.readInt();

            if (chunkType === 0x01000000) {
              msg.readIntChunk(record);
            } else if (chunkType === 0x03000000) {
              msg.readI64Chunk(record);
            } else if (chunkType === 0x06000000) {
              msg.readStringChunk(record);
            } else {
              msg.skipChunk();
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
