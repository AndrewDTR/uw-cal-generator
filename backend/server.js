const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.post("/", (req, res) => {
    console.log(req.body);
    res.send("hi");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
