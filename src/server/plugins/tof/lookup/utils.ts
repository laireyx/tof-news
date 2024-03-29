import { LookupRecord } from "../../../tof/lookup";

const ResonanceWeapons = {
  physic: ["arm_physic", "sword_physic", "Whip_physic"],
  fire: ["funnel_fire", "gun_fire", "Snipe_fire"],
  ice: ["Dkatana_ice", "Frigg_ice", "iceblade_ice"],
  thunder: ["Suspension_thunder", "tianlang_thunder", "fenrir_thunder"],
  harmony: ["fenrir_thunder"],
};

function calculateActualAtk(record: LookupRecord) {
  const resonanceCount = {
    physic: 0,
    fire: 0,
    ice: 0,
    thunder: 0,
    superpower: 0,
  };

  const percentage = {
    physic: 1,
    fire: 1,
    ice: 1,
    thunder: 1,
  };

  record.data.equipments.forEach(({ options }) => {
    options.forEach(({ element, value, adjust, amount }) => {
      if (value === "Atk" && adjust === "Mult") {
        const percentageAmount = parseFloat(amount ?? "0");

        switch (element) {
          case "Phy":
            percentage.physic += percentageAmount;
            break;
          case "Fire":
            percentage.fire += percentageAmount;
            break;
          case "Ice":
            percentage.ice += percentageAmount;
            break;
          case "Thunder":
            percentage.thunder += percentageAmount;
            break;
          case "Common":
            percentage.physic += percentageAmount;
            percentage.fire += percentageAmount;
            percentage.ice += percentageAmount;
            percentage.thunder += percentageAmount;
            break;
        }
      }
    });
  });

  record.data.weapons.forEach(({ name }) => {
    const [, element] = (name.match(/_(.+)/) ?? []) as [
      string,
      keyof typeof resonanceCount
    ];

    if (element) {
      resonanceCount[element]++;
    }
  });

  function applyResonance(
    elem: Exclude<keyof typeof ResonanceWeapons, "harmony">
  ) {
    if (
      resonanceCount[elem] >= 2 &&
      record.data.weapons.some(({ name }) =>
        ResonanceWeapons[elem].includes(name)
      )
    ) {
      percentage[elem] += 0.15;
    }
  }

  applyResonance("physic");
  applyResonance("fire");
  applyResonance("ice");
  applyResonance("thunder");

  // Apply harmony resonance
  if (
    (resonanceCount.physic === 0 ? 1 : 0) +
      (resonanceCount.fire === 0 ? 1 : 0) +
      (resonanceCount.ice === 0 ? 1 : 0) +
      (resonanceCount.thunder === 0 ? 1 : 0) +
      (resonanceCount.superpower === 0 ? 1 : 0) ===
    2
  ) {
    if (
      record.data.weapons.some(({ name }) =>
        ResonanceWeapons.harmony.includes(name)
      )
    ) {
      percentage.physic += 0.15;
      percentage.fire += 0.15;
      percentage.ice += 0.15;
      percentage.thunder += 0.15;
    }
  }

  record.data.player.phyAtkDefault =
    (record.data.player.phyAtkBase ?? 0) * percentage.physic;
  record.data.player.fireAtkDefault =
    (record.data.player.fireAtkBase ?? 0) * percentage.fire;
  record.data.player.iceAtkDefault =
    (record.data.player.iceAtkBase ?? 0) * percentage.ice;
  record.data.player.thunderAtkDefault =
    (record.data.player.thunderAtkBase ?? 0) * percentage.thunder;
}

export { calculateActualAtk };
