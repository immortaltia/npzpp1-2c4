import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import usersRouter from "./routes/users";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
