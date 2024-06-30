import cors from "cors";
import express from "express";
import "dotenv/config";

const PORT = process.env.PORT || 3000;
const app = express();

const REFRESH_INTERVAL = 5 * 60 * 1000; // 10 minutes

// Functions
async function fetchGames() {
  try {
    await fetch("https://football-backend-20qh.onrender.com");
    console.log("Games refreshed");
  } catch (error) {
    console.error("Error refreshing games:", error);
  }
}

async function fetchYouTube() {
  try {
    const response = await fetch("https://youtube-project-kqfs.onrender.com");
    const data = await response;
    console.log(data, "\nYouTube kept alive");
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
  }
}

// Initial fetch
fetchGames();
fetchYouTube();

// Set interval to call fetchGames and fetchYouTube every 10 minutes
const gamesInterval = setInterval(fetchGames, REFRESH_INTERVAL);
const youtubeInterval = setInterval(fetchYouTube, REFRESH_INTERVAL);

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
