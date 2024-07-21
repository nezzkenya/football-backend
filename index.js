import cors from "cors";
import express from "express";
import "dotenv/config";

const PORT = process.env.PORT || 3000;
const app = express();

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Functions

async function fetchGames() {
  try {
    const response = await fetch("https://football-backend-1-y85i.onrender.com");
    const data = await response;
    console.log(data, "\n tg kept alive");
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
  }
}
async function fetchYouTube() {
  try {
    const response = await fetch("https://youtube-project-cil7.onrender.com");
    const data = await response;
    console.log(data, "\nYouTube kept alive");
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
  }
}

fetchGames();
fetchYouTube();
fetchTg();

setInterval(fetchGames, REFRESH_INTERVAL);
setInterval(fetchYouTube, REFRESH_INTERVAL);

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
