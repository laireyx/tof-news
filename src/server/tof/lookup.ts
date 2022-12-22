type WeaponStat = {
  name: string;
  stars: number;
  level: number;
};

type EquipmentOptionElement =
  | "Common"
  | "Phy"
  | "Thunder"
  | "Fire"
  | "Ice"
  | "Superpower";
type EquipmentOptionVar = "Atk" | "Def" | "MaxHealth" | "Crit";
type EquipmentOptionMod = "Added" | "Mult";

type EquipmentOptionType =
  | "CommonAtkAdded"
  | "PhyAtkAdded"
  | "ThunderAtkAdded"
  | "FireAtkAdded"
  | "IceAtkAdded"
  | "SuperpowerAtkAdded"
  | "CommonDefAdded"
  | "PhyDefAdded"
  | "ThunderDefAdded"
  | "FireDefAdded"
  | "IceDefAdded"
  | "SuperpowerDefAdded"
  | "MaxHealthAdded"
  | "CritAdded";

type EquipmentOption = {
  type: string;
  amount: string;
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
  timestamp: number;
  data: {
    weapons: WeaponStat[];
    equipments: EquipmentStat[];
  };
};

type LookupResponse = {
  queued?: boolean;
  data?: LookupRecord;
};

export { LookupResponse, LookupRecord, EquipmentOption };
