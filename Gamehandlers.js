import db from "./connection.js";

export async function getLivegames(req,res) {
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
              _id: 0
            },
          },
        ];
    
        const results2 = await collection2.aggregate(pipeline).toArray();
        res.status(201).json({games : results2})
    } catch (error) {
        
    }
}