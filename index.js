import cors from "cors";
import express from "express";
import "dotenv/config";
import Routes from "./routes.js";
import main from "./DeleteGames.js";

const PORT = process.env.PORT || 3000;
const app = express();
const R3 = async () => {
  const res = await fetch("https://youtube-project-gcqn.onrender.com",{
    method: "GET"
  })
  const data = await res.json()
  console.log(data)
}
// Call GetGames initially
main();
// Set interval to call GetGames every 5 minutes
const intervalId2 = setInterval(main, 10 * 60 * 1000);
const intervalId4 = setInterval(R3,60*1000);
app.use(cors());
app.use(express.json());
app.use("/api", Routes);

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
