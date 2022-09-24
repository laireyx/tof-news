import "dotenv/config";
import TwitterStation from "./station/twitter/index";

const station = new TwitterStation();
station.listen();
