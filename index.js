import cors from "cors";
import express from "express";
import "dotenv/config";
import GetGames from "./Games.js";
import router from "./Routes.js";
import main from "./DeleteGames.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Call GetGames initially
GetGames();
main()
// Set interval to call GetGames every 5 minutes
const intervalId = setInterval(GetGames, 5 * 60 * 1000);
const intervalId2 = setInterval(main, 5 * 60 * 1000);
app.use(cors());
app.use(express.json());
app.use("/api",router)

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
