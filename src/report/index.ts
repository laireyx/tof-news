import { MongoClient } from "mongodb";
import { env } from "node:process";
import { News } from "./news";

const client = new MongoClient(
  `mongodb+srv://${env.MONGO_AUTHORITY}/tof-news?retryWrites=true&w=majority`
);

async function report(news: News) {
  const connection = await client.connect();
  const newsCollection = connection.db().collection("news");

  return await newsCollection.insertOne(news);
}

export default report;
export { News };
