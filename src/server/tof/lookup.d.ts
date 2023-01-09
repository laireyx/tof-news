import { Server } from "./servers";

type PlayerStat = Partial<{
  maxHp: number;
  crit: number;

  phyAtkBase: number;
  fireAtkBase: number;
  iceAtkBase: number;
  thunderAtkBase: number;
  superpowerAtkBase: number;

  phyAtkDefault: number;
  fireAtkDefault: number;
  iceAtkDefault: number;
  thunderAtkDefault: number;
  superpowerAtkDefault: number;

  phyAtk: number;
  fireAtk: number;
  iceAtk: number;
  thunderAtk: number;
  superpowerAtk: number;

  phyDef: number;
  fireDef: number;
  iceDef: number;
  thunderDef: number;
  superpowerDef: number;
}>;

type PlayerStatKeys = keyof PlayerStat;

type WeaponStat = {
  name: string;
  stars: number;
  level: number;
};

type EquipmentOptionElement =
  | "Common"
  | "Element"
  | "Phy"
  | "Thunder"
  | "Fire"
  | "Ice"
  | "Superpower";
type EquipmentOptionValue = "Atk" | "Def" | "MaxHealth" | "Crit";
type EquipmentOptionAdjust = "Added" | "Mult" | "ExtraUpMult";

type EquipmentOption = {
  element?: EquipmentOptionElement;
  value?: EquipmentOptionValue;
  adjust?: EquipmentOptionAdjust;
  amount?: string;
};

type EquipmentStat = {
  part: string;
  level: number;
  options: EquipmentOption[];
  stars: number;
};

type LookupRecord = {
  uid: string;
  name: string;
  server: Server;

  guildName?: string;
  inGameUid: string;
  level: number;
  battleStrength: number; // aka GS

  timestamp: number;
  data: {
    player: PlayerStat;
    weapons: WeaponStat[];
    equipments: EquipmentStat[];
  };
};

export {
  LookupRecord,
  EquipmentOption,
  EquipmentOptionElement,
  EquipmentOptionValue,
  EquipmentOptionAdjust,
  WeaponStat,
  EquipmentStat,
  PlayerStat,
  PlayerStatKeys,
};
