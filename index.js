
import express from "express";
import "dotenv/config";
import GetGames from "./Games.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Call GetGames initially
GetGames();
// Set interval to call GetGames every 5 minutes
const intervalId = setInterval(GetGames, 8 * 60 * 1000)

app.get("/", async (req,res)=>{
  res.send("hi there")
}
        )

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
