import fp from "fastify-plugin";
import { env } from "node:process";

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

const gotOptions = {
  method: "GET",
  headers: {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng," +
      "*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "cache-control": "max-age=0",
    dnt: "1",
    cookie: env.WEIBO_COOKIE,
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/101.0.4951.54 Safari/537.36",
  },
  followRedirect: true,
};

function newsify(resp: BlogResponse) {
  return resp.data.list.map(
    ({ mid, user, created_at, text_raw, pic_ids, pic_infos }) => ({
      url: `https://api.weibo.com/2/statuses/go?uid=${user.id}&id=${mid}`,
      lang: "zh-CN",
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
    })
  );
}

export default fp(
  async function (fastify, opts) {
    await fastify.intervalFetch({
      resource: "https://weibo.com/ajax/statuses/mymblog?uid=7455256856",
      gotOptions,
      newsify,
    });

    console.log("[@plugin/cn-weibo] Interval fetch installed");
  },
  {
    name: "interval-fetch/cn-weibo",
    dependencies: ["interval-fetch"],
  }
);
