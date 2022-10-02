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

function newsify(resp: BoardResponse) {
  return resp.data.info_content.map(
    ({ content_id, author, content_part, pub_timestamp, pic_urls }) => ({
      url: `https://www.toweroffantasy-global.com/news-detail.html?content_id=${content_id}&`,
      lang: "en",
      source: "Homepage/EN",
      author,
      content: content_part + "...",
      timestamp: new Date(1000 * +pub_timestamp),
      media: pic_urls.map((pictureUrl) => ({
        type: "photo",
        url: pictureUrl,
      })),
    })
  );
}

export default fp(
  async function (fastify, opts) {
    const labels = ["260", "261"];
    await Promise.all(
      labels.map(async (label) => {
        await fastify.intervalFetch({
          resource:
            "https://na.levelinfiniteapps.com/api/trpc/trpc.wegame_app_global.information_feeds_svr.InformationFeedsSvr/GetContentByLabel",
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
              get_num: 20,
              primary_label_id: "158",
              secondary_label_id: label,
              use_default_language: false,
              language: ["en"],
            },
          },
          newsify,
        });
      })
    );

    console.log("[@plugin/global-official] Interval fetch installed");
  },
  {
    name: "interval-fetch/global-official",
    dependencies: ["interval-fetch"],
  }
);
