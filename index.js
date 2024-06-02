import cors from "cors";
import express from "express";
import "dotenv/config";
import GetGames from "./Games.js";
import Routes from "./Routes.js";
import main from "./DeleteGames.js";
import ComingGames from "./ComingGames.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Call GetGames initially
GetGames();
main();
ComingGames();
// Set interval to call GetGames every 5 minutes
const intervalId = setInterval(GetGames, 5 * 60 * 1000);
const intervalId2 = setInterval(main, 5 * 60 * 1000);
const intervalId3 = setInterval(ComingGames, 60 * 60 * 1000);
app.use(cors());
app.use(express.json());
app.use("/", Routes);

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
