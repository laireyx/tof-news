import fp from "fastify-plugin";
import { News } from "../../report/index";

type BlogUser = {
  id: number;
  screen_name: string;
  profile_image_url: string;
};

type BlogPictureInfo = {
  original: { url: string };
  thumbnail: { url: string };
};

type BlogArticle = {
  mid: string;
  created_at: string;
  user: BlogUser;
  text_raw: string;
  pic_ids?: string[];
  pic_infos?: {
    [key: string]: BlogPictureInfo;
  };
};

type BlogData = {
  list: BlogArticle[];
};

type BlogResponse = {
  data: BlogData;
};

export default fp(
  async function (fastify, opts) {
    const got = await import("got").then((module) => module.default);
    const collection = fastify.mongo.db?.collection("cn-weibo");
    const FETCH_INTERVAL = 60 * 1000;

    const newsBoardUrl =
      "https://weibo.com/ajax/statuses/mymblog?uid=7455256856";

    const watch = async () => {
      const result: BlogResponse = await got
        .post(newsBoardUrl, {
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
        })
        .json();

      await result.data.list.map(
        async ({ mid, user, created_at, text_raw, pic_ids, pic_infos }) => {
          const news: News = {
            url: `http://api.weibo.com/2/statuses/go?uid=${user.id}&id=${mid}`,
            source: "Weibo/CN",
            author: user.screen_name,
            authorImg: user.profile_image_url,
            content: text_raw,
            timestamp: new Date(created_at),
            media:
              pic_ids?.map((picId) => ({
                type: "photo",
                url: pic_infos?.[picId].original.url,
                previewUrl: pic_infos?.[picId].thumbnail.url,
              })) ?? [],
          };

          return await collection?.updateOne(
            { url: news.url },
            { $set: news },
            { upsert: true }
          );
        }
      );

      setTimeout(() => watch(), FETCH_INTERVAL);
    };

    watch();
    console.log("[@plugin/cn-weibo] Interval fetch installed");
  },
  {
    name: "cn-weibo",
    dependencies: ["mongodb"],
  }
);
