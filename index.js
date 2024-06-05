import cors from "cors";
import express from "express";
import "dotenv/config";
import Routes from "./routes.js";
import main from "./DeleteGames.js";

const PORT = process.env.PORT || 3000;
const app = express();
const R1 = async () => {
  const res = await fetch("https://football-backend-2.onrender.com/")
  const data = await res.json()
  console.log(data)
}
const R2 = async () => {
  const res = await fetch("https://football-backend-3.onrender.com/")
  const data = await res.json()
  console.log(data)
}
// Call GetGames initially
main();
// Set interval to call GetGames every 5 minutes
const intervalId2 = setInterval(main, 20 * 60 * 1000);
const intervalId = setInterval(R1, 3 * 60 * 1000);
const intervalId3 = setInterval(R2, 3 * 60 * 1000);
app.use(cors());
app.use(express.json());
app.use("/api", Routes);

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
