import express from "express";
import db from "./connection.js";
import { getLivegames } from "./Gamehandlers.js";
const router = express.Router();

// Function to filter games
function getNotStartedGames(games) {
  const now = new Date();

  // Filter games that have not started yet
  const upcomingGames = games.filter(game => {
    if (game.time === "24/7") return false;

    // Parse the game time
    const timeParts = game.time.split(' ');
    const time = timeParts[0];
    const period = timeParts[1];

    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    // Create a date object for the game time
    const gameDate = new Date(now);
    gameDate.setHours(hours, minutes, 0, 0);

    // Compare the game time with the current time
    return gameDate > now;
  });

  return upcomingGames;
}

router.get("/coming", async (req, res) => {
  try {
    const collection = await db.collection("all-games");
    const results = await collection.find({}).project({ _id: 0,href: 0 }).toArray();
    const cg = getNotStartedGames(results); 

    res.status(200).json({coming: cg }); 

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" }); 
  }
});

router.get("/live", async (req,res)=>{
  await getLivegames(req,res)
})
router.get("/game/:id", async (req, res) => {
  const link = req.params.id;
  try {
    const collection = await db.collection("games");
    const results = await collection
      .find({ link: link })
      .project({
        Quality: 1,
        stream: 1,
        Name: 1,
        language: 1,
        _id: 0,
      })
      .toArray();
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

router.get("/watch/:game/:stream", async (req, res) => {
  const stream = req.params.stream;
  const game = req.params.game;
  try {
    const collection = await db.collection("games");
    const results = await collection.findOne({ stream: stream, link: game }, { projection: { Quality:1, Name : 1 , iframeSrc: 1} });  // Limiting fields to reduce payload
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

export default router;
