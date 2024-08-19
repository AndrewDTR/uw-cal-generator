const express = require("express");
const ical = require("ical-generator").default; 
const { ICalCalendarMethod } = require("ical-generator");
const app = express();
const fs = require("fs");
const path = require("path");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/", (req, res) => {
    console.log("Received body:", req.body);

    for (const key in req.body) {
        console.log("new class " + key);
        const parsedData = JSON.parse(req.body[key]);
        for (const val in parsedData) {
            console.log("new thing in class " + val + ": " + parsedData[val]);
        }
    }
}
);

app.get("/api/calendar", (req, res) => {
    const calendar = ical({ name: "My Repeating iCal" });

    calendar.method(ICalCalendarMethod.REQUEST);

    const startDate = new Date("2024-08-15T00:00:00");
    const endDate = new Date("2024-08-15T01:00:00"); 

    calendar.createEvent({
        start: startDate,
        end: endDate,
        timezone: "America/Chicago",
        summary: "",
        description: "This event repeats every day from Aug 15, 2024 to Aug 30, 2024 but excludes Aug 25-26.",
        location: "My Location",
        url: "http://sebbo.net/",
        repeating: {
            freq: "DAILY", 
            until: new Date("2024-08-30T23:59:59"), 
            exclude: [
                new Date("2024-08-25T00:00:00"), 
                new Date("2024-08-26T00:00:00")  
            ],
            interval: 1 
        },
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="calendar.ics"'
    );

    res.send(calendar.toString());
});

app.get("/api/dates", (req, res) => {
    const filePath = path.join(__dirname, "dates.json");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        res.status(200).json(JSON.parse(data));
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
