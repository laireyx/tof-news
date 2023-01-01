import fp from "fastify-plugin";
import { env } from "node:process";
import { LookupRecord } from "../../tof/lookup";

type NametagResponse = {
  svg: string;
  maxAge: number;
};

declare module "fastify" {
  interface FastifyInstance {
    tofNametag: (uid: string) => Promise<NametagResponse>;
  }
}

export default fp(
  async function (fastify, opts) {
    const collection = fastify.mongo.db?.collection<LookupRecord>("lookup");
    const dataUris: Map<string, string> = new Map();
    const got = await import("got").then((module) => module.default);

    async function urlToDataUri(url: string) {
      let b64: string;

      if (dataUris.has(url)) {
        b64 = dataUris.get(url)!;
      } else {
        b64 = await got(url)
          .then((resp) => resp.rawBody)
          .then((buffer) => buffer.toString("base64"));

        dataUris.set(url, b64);
      }

      return b64;
    }

    const avatarImg = await urlToDataUri(
      "https://www.tof.news/img/nametag/Avatar_Fenrir.webp"
    );

    fastify.decorate(
      "tofNametag",
      async function (uid: string): Promise<NametagResponse> {
        const user = await collection?.findOne({ uid });

        if (!user)
          return {
            svg: `<svg width="480" height="320" viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>`,
            maxAge: 3600,
          };

        if (Date.now() < user.timestamp + +(env.LOOKUP_EXPIRE ?? "3600000"))
          fastify.tofLookupByUid(uid);

        const weaponImages = (
          await Promise.all(
            user.data.weapons.map(async (weapon, idx) => {
              const b64 = await urlToDataUri(
                `https://www.tof.news/img/weapon/${weapon.name}.webp`
              );

              return `<image x="${
                192 + idx * 88
              }" y="160" width="80" height="80" href="data:image/webp;base64,${b64}"/>`;
            })
          )
        ).join("");

        return {
          svg: `<svg width="480" height="320" viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          
            <style>
              @font-face {
                font-family: 'IBM Plex Mono';
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/s/ibmplexmono/v15/-F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2) format('woff2');
                unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
              }
              @font-face {
                font-family: "NanumSquareRound";
                font-style: normal;
                font-weight: 400;
                src: url("https://cdn.jsdelivr.net/gh/innks/NanumSquareRound@master/NanumSquareRoundR.woff") format("woff");
              }
              @font-face {
                font-family: "NanumSquareRound";
                font-style: normal;
                font-weight: 600;
                src: url("https://cdn.jsdelivr.net/gh/innks/NanumSquareRound@master/NanumSquareRoundB.woff") format("woff");
              }
            </style>

          <style>.info{font-family:'NanumSquareRound',sans-serif;fill:#fff;text-shadow:1px 1px 2px #87ceeb}.uid{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;fill:#fff}</style>
          
          <path d="M2 34Q0 0 34 2h412q34-2 32 30v254q2 34-32 32H34q-34 2-32-32Z" fill="#030066" stroke="#fff" stroke-width="2"/>
          <image y="64" width="192" height="192" href="data:image/webp;base64,${avatarImg}"/>
          <text x="192" y="72" style="fill:#fff;font-family:'NanumSquareRound',sans-serif;font-weight:600;font-size:32px;text-shadow:1px 1px 4px #87ceeb">
            ${user.name}
          </text>
          <text x="192" y="104" class="info">
            Lvl. ${user.level} / GS ${user.battleStrength}
          </text>
          <text x="192" y="128" class="info">
            ${user.guildName ?? "[길드 미소속]"}
          </text>
          <a href="//api.tof.news/nametag/${user.uid}" target="_blank">
            <text x="334" y="284" class="uid">
              ${user.uid}
            </text>
          </a>
          <text x="320" y="300" class="uid">
            powered by tof.news
          </text>
          ${weaponImages}
          </svg>`,
          maxAge: 600,
        };
      }
    );
  },
  {
    name: "tof/nametag",
  }
);
