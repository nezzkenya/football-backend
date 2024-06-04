import cors from "cors";
import express from "express";
import "dotenv/config";
import ComingGames from "./ComingGames.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Call GetGames initially
ComingGames();
// Set interval to call GetGames every 5 minutes
const intervalId3 = setInterval(ComingGames, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
