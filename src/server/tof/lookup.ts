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

  guildName?: string;
  inGameUid: string;
  level: number;
  battleStrength: number; // aka GS

  timestamp: number;
  data: {
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
};
