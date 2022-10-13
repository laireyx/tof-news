import fp from "fastify-plugin";

type FeedUser = {
  avatar: string;
  nickname: string;
};
type FeedImage = {
  compression: string;
  thumbnail: string;
  url: string;
};

type FeedArticle = {
  articleId: number;
  createDateTime: number;
  userInfo: FeedUser;
  content: string;
  imgItems: FeedImage[];
};

type FeedData = {
  articleItem: FeedArticle;
};

type FeedResponse = {
  data: FeedData[];
};

const gotOptions = {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  },
  body: "pageNum=1&pageSize=20&sectionId=55&sortType=2",
  followRedirect: true,
};

function newsify(resp: FeedResponse) {
  return resp.data.map(({ articleItem }) => {
    const { articleId, createDateTime, userInfo, content, imgItems } =
      articleItem;

    return {
      url: `https://douliu.wanmei.com/article-detail.html?aid=${articleId}`,
      lang: "zh-CN",
      source: "Homepage/CN",
      author: userInfo.nickname,
      authorImg: userInfo.avatar,
      content,
      timestamp: new Date(createDateTime * 1000),
      media:
        imgItems?.map(({ compression, thumbnail }) => ({
          type: "photo",
          url: compression,
          previewUrl: thumbnail,
        })) ?? [],
    };
  });
}

export default fp(
  async function (fastify, opts) {
    await fastify.intervalFetch({
      resource: "https://pwgcapi.wanmei.com/pc/feed/pageBySectionId",
      gotOptions,
      newsify,
    });

    console.log("[@plugin/cn-wanmei] Interval fetch installed");
  },
  {
    name: "interval-fetch/cn-wanmei",
    dependencies: ["interval-fetch"],
  }
);
