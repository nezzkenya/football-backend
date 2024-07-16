import cors from "cors";
import express from "express";
import "dotenv/config";
import Routes from "./routes.js";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", Routes);
app.get("/",async (req,res)=>{
  res.send("hi there").status(201)
})
app.listen(PORT, () => {
  console.log(`App is running and listening on port ${PORT}`);
});
