import express from "express";
import helmet from "helmet";

const PORT = 3001;

const app = express();

// Use Helmet!
app.use(helmet());

app.get("/api/v1/", (req, res) => {
  res.send("Hello !");
});

app.listen(PORT, () => {
  console.log(`running on port: ${PORT}`);
});
