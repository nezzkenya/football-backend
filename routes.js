import express from "express";
import db from "./connection.js";
const router = express.Router();

router.get("/allgames", async (req, res) => {
  try {
    const collection = await db.collection("all-games");
    const results = await collection.find({}).toArray();
    res.json(results).status(200);
  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
  }
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

router.get("/games", async (req, res) => {
  try {
    const collection = await db.collection("games");

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

    const results = await collection.aggregate(pipeline).toArray();
    res.json(results).status(200);
  } catch (error) {
    res.json("an error occurred").status(500);
    console.log(error);
  }
});

export default router;
