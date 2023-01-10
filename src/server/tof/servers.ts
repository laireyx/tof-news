const Servers = {
  "101": { host: "8.213.133.1", uid: "42945811784491918" },
  "102": { host: "8.213.130.139", uid: "42945816079448220" },
  "103": { host: "8.213.133.1", uid: "42945811784491918" },
  "104": { host: "8.213.130.139", uid: "42945816079448220" },
  "105": { host: "8.213.133.1", uid: "42945811784491918" },
  "106": { host: "8.213.130.139", uid: "42945816079448220" },
  "107": { host: "8.213.133.1", uid: "42945811784491918" },
} as const;

type Server = keyof typeof Servers;

export { Server, Servers };
