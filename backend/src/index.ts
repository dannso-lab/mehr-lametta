import express from "express";
import helmet from "helmet";

const PORT = 3001;

const app = express();

// Use Helmet!
app.use(helmet());
app.use(function (req, res, next) {
  res.setHeader("X-Robots-Tag", "noindex,nofollow");
  next();
});

app.get("/api/v1/", (req, res) => {
  res.send("Hello !");
});

app.listen(PORT, () => {
  console.log(`running on port: ${PORT}`);
});
