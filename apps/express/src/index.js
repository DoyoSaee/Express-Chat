const express = require("express");
const app = express();
const publicPath = path.join(__dirname, "../public");

app.use(express.static(publicPath));

const port = 8081;
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
