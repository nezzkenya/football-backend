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
    const results = await collection.find({}).toArray();
    const cg = await getNotStartedGames(results)
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
          _id: 0,
          Name: 1,
          link: 1,
        },
      },
    ];

    const results2 = await collection2.aggregate(pipeline).toArray();
    res.json({all:cg, live : results2}).status(200);

  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
  }
});
router.get("/123", async (req, res) => {
  GetGames();
  res.send("games fetched");
});

router.get("/", async (req, res) => {
  try {
    const collection = await db.collection("games");
    const results = await collection.find({}).toArray();
    res.json(results).status(200);
  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
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
        language:1 ,
        _id: 0,
      })
      .toArray();
    res.json(results).status(200);
  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
  }
});
router.get("/watch/:game/:stream", async (req, res) => {
  const stream = req.params.stream;
  const game = req.params.game;
  try {
    const collection = await db.collection("games");
    const results = await collection.findOne({ stream: stream, link: game });
    res.json(results).status(200);
  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
  }
});

export default router;
