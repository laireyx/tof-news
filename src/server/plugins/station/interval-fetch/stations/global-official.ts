import fp from "fastify-plugin";

type BoardContent = {
  author: string;
  content_desc: string;
  content_id: string;
  content_part: string;
  content_type: number;
  title: string;
  pic_urls: string[];
  pub_timestamp: string;
};

type BoardData = {
  errmsg: string;
  info_content: BoardContent[];
  next_offset: number;
  result: number;
  total_num: number;
};

type BoardResponse = {
  code: number;
  data: BoardData;
  msg: string;
};

export default fp(
  async function (fastify, opts) {
    await fastify.intervalFetch({
      resource:
        "https://na.levelinfiniteapps.com/api/trpc/trpc.wegame_app_global.information_feeds_svr.InformationFeedsSvr/GetContentByLabel",
      interval: 60 * 1000,
      gotOptions: {
        method: "POST",
        headers: {
          "x-areaid": "na",
          "x-gameid": "4",
          "x-language": "en",
          "x-source": "pc_web",
        },
        json: {
          gameid: "4",
          offset: 0,
          get_num: 10,
          primary_label_id: "158",
          secondary_label_id: "260",
          use_default_language: false,
          language: ["en"],
        },
      },
      newsify(resp: BoardResponse) {
        return resp.data.info_content.map(
          ({ content_id, author, content_part, pub_timestamp, pic_urls }) => {
            const timestamp = new Date(1000 * +pub_timestamp);
            return {
              url: `https://www.toweroffantasy-global.com/news-detail.html?content_id=${content_id}&`,
              lang: "en",
              source: "Homepage/EN",
              author,
              content: content_part + "...",
              timestamp,
              media: pic_urls.map((pictureUrl) => ({
                type: "photo",
                url: pictureUrl,
              })),
            };
          }
        );
      },
    });

    console.log("[@plugin/global-official] Interval fetch installed");
  },
  {
    name: "global-official",
    dependencies: ["interval-fetch"],
  }
);
