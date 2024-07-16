import express from "express";
import db from "./connection.js";
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

router.get("/allgames", async (req, res) => {
  try {
    const collection = await db.collection("all-games");
    const results = await collection.find({}).project({ _id: 0 }).toArray();
    const cg = getNotStartedGames(results);  // No need for await since it's not an async function

    const collection2 = await db.collection("games");

    const pipeline = [
      {
        $group: {
          _id: "$Name",
          document: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$document" },
      },
      {
        $project: {
          Name: 1,
          link: 1,
        },
      },
    ];

    const results2 = await collection2.aggregate(pipeline).toArray();

    res.status(200).json({ all: cg, live: results2 });  // Status code should be set before sending JSON

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });  // Improved error response
  }
});
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
