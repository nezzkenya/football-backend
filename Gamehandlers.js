import db from "./connection.js";

export async function getLivegames(req, res) {
    try {
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
                    time: 1,
                    _id: 0
                },
            },
            {
                $facet: {
                    "allDayGames": [
                        { $match: { time: "24/7" } },
                        { $sort: { Name: 1 } }  // Sorting by Name within the "allDayGames" facet
                    ],
                    "timedGames": [
                        { $match: { time: { $regex: /^[0-9]{1,2}:[0-9]{2} [AP]M$/ } } },
                        { $sort: { Name: 1 } }  // Sorting by Name within the "timedGames" facet
                    ]
                }
            }
        ];

        const results2 = await collection2.aggregate(pipeline).toArray();
        res.status(201).json(results2);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
