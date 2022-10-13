import fp from "fastify-plugin";

type ImageMedia = {
  type: "photo" | "animated_gif";
  url?: string;
  previewUrl?: string;
};

type VideoMedia = {
  type: "video";
  url?: string[];
  previewUrl?: string;
};

type MiscMedia = {
  type: string;
  url?: string | string[];
  previewUro?: string;
};

type NewsMedia = ImageMedia | VideoMedia | MiscMedia;

type News = {
  url: string;
  lang: string;
  source: string;
  author: string;
  authorImg?: string;
  content: string;
  timestamp: Date;
  media: NewsMedia[];
};

declare module "fastify" {
  interface FastifyInstance {
    report: (news: News) => Promise<void>;
  }
}

export default fp(
  async function (fastify, opts) {
    fastify.decorate("report", async function (news: News) {
      console.log("[@plugin/report] News: ", JSON.stringify(news, null, 2));

      const newsCollection = fastify.mongo.db?.collection("news");
      await newsCollection?.updateOne(
        { url: news.url },
        { $set: news },
        { upsert: true }
      );

      fastify.invalidateNews();
    });
  },
  {
    name: "report",
    dependencies: ["news"],
  }
);
export { News };
