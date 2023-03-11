import {
  EquipmentOption,
  EquipmentOptionAdjust,
  EquipmentOptionElement,
  EquipmentOptionValue,
  LookupRecord,
} from "../../../tof/lookup";
import { TofResponse } from "../../../tof/reader";

class TofUserResponse extends TofResponse {
  constructor(msg: TofResponse) {
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
    } else if (i64Type === "OfflineMoment") {
      const offlineMoment = i64Buffer.readBigUint64LE(offset);
      record.offlineMoment = offlineMoment.toString();
    }
  }

  readIntChunk(record: LookupRecord) {
    const chunkSize = this.readInt() ?? 0;
    const intBuffer = this.readSize(chunkSize - 4);
    const intType = this.readString();

    if (!intBuffer || !intType) return;
    const intData = intBuffer.readUint32LE(intBuffer.length - 4);

    if (intType === "level") {
      record.level = intData;
    } else if (intType === "BattleStrengthScore") {
      record.battleStrength = intData;
    }
  }

  readFloatChunk(record: LookupRecord) {
    const chunkSize = this.readInt() ?? 0;
    const floatBuffer = this.readSize(chunkSize - 4);
    const floatType = this.readString();

    if (!floatBuffer || !floatType) return;
    const floatData = floatBuffer.readFloatLE(floatBuffer.length - 4);

    if (floatType === "MaxHP") {
      record.data.player.maxHp = floatData;
    } else if (floatType === "Crit") {
      record.data.player.crit = floatData;
    } else if (floatType === "PhyAtkDisplayBase") {
      record.data.player.phyAtkBase = floatData;
    } else if (floatType === "FireAtkDisplayBase") {
      record.data.player.fireAtkBase = floatData;
    } else if (floatType === "IceAtkDisplayBase") {
      record.data.player.iceAtkBase = floatData;
    } else if (floatType === "ThunderAtkDisplayBase") {
      record.data.player.thunderAtkBase = floatData;
    } else if (floatType === "SuperpowerAtkDisplayBase") {
      record.data.player.superpowerAtkBase = floatData;
    } else if (floatType === "PhysicalAttack") {
      record.data.player.phyAtk = floatData;
    } else if (floatType === "FireAtk") {
      record.data.player.fireAtk = floatData;
    } else if (floatType === "IceAtk") {
      record.data.player.iceAtk = floatData;
    } else if (floatType === "ThunderAtk") {
      record.data.player.thunderAtk = floatData;
    } else if (floatType === "SuperpowerAtk") {
      record.data.player.superpowerAtk = floatData;
    } else if (floatType === "PhysicalDef") {
      record.data.player.phyDef = floatData;
    } else if (floatType === "FireDefense") {
      record.data.player.fireDef = floatData;
    } else if (floatType === "IceDefense") {
      record.data.player.iceDef = floatData;
    } else if (floatType === "ThunderDefense") {
      record.data.player.thunderDef = floatData;
    } else if (floatType === "SuperpowerDefense") {
      record.data.player.superpowerDef = floatData;
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

export default TofUserResponse;
