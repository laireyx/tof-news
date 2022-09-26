import fp from "fastify-plugin";

type NewsMedia = {
  type: "photo" | "animated_gif" | string;
  url?: string;
  previewUrl?: string;
};

type News = {
  url: string;
  source: string;
  author: string;
  authorImg?: string;
  content: string;
  timestamp: Date;
  media: NewsMedia[];
};

declare module "fastify" {
  interface FastifyInstance {
    report: (news: News) => Promise<any>;
  }
}

export default fp(
  async function (fastify, opts) {
    fastify.decorate("report", async function (news: News) {
      console.log("[@plugin/report] News: ", JSON.stringify(news, null, 2));

      const newsCollection = fastify.mongo.db?.collection("news");
      return await newsCollection?.updateOne(
        { url: news.url },
        { $set: news },
        { upsert: true }
      );
    });
  },
  {
    name: "report",
    dependencies: ["mongodb"],
  }
);
export { News };
