const express = require("express");
const ical = require("ical-generator").default;
const { ICalCalendarMethod } = require("ical-generator");
const fs = require("fs");
const path = require("path");
const cors = require('cors');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const loadExcludedDates = () => {
    const filePath = path.join(__dirname, "dates.json");
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const excludedDates = [];

        if (data.once) {
            excludedDates.push(...data.once.map(event => new Date(event.date + "T00:00:00")));
        }

        if (data.range) {
            data.range.forEach(event => {
                let currentDate = new Date(event.start_date + "T00:00:00");
                const endDate = new Date(event.end_date + "T23:59:59");
                while (currentDate <= endDate) {
                    excludedDates.push(new Date(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        }

        return excludedDates;
    } catch (err) {
        console.error("Error reading dates.json:", err);
        return [];
    }
};

const loadSemesterDates = () => {
    const filePath = path.join(__dirname, "dates.json");
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return {
            startDate: new Date(data["start-end"].start_date + "T00:00:00"),
            endDate: new Date(data["start-end"].end_date + "T23:59:59")
        };
    } catch (err) {
        console.error("Error loading semester dates:", err);
        return {
            startDate: new Date(), // default to current date if there's an error
            endDate: new Date()
        };
    }
};

app.post("/", (req, res) => {
    console.log("Received body:", req.body);
    const calendar = ical({ name: "Class Schedule" });
    calendar.method(ICalCalendarMethod.REQUEST);

    const { startDate, endDate } = loadSemesterDates();
    const excludedDates = loadExcludedDates();

    for (const key in req.body) {
        try {
            const parsedData = JSON.parse(req.body[key]);

            if (parsedData.lecture && !parsedData.lecture.includes("ONLINE")) {
                const lectureInfo = parsedData.lecture.match(/(\b[A-Z]+\b)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})/);
                if (lectureInfo) {
                    const daysOfWeek = lectureInfo[1]; 
                    const startTime = lectureInfo[2];
                    const endTime = lectureInfo[3]; 

                    const [startHour, startMinute] = startTime.split(/:| /).map(Number);
                    const [endHour, endMinute] = endTime.split(/:| /).map(Number);

                    const daysMapping = {
                        M: "MO", // Monday
                        T: "TU", // Tuesday
                        W: "WE", // Wednesday
                        R: "TH", // Thursday
                        F: "FR"  // Friday
                    };

                    const byDay = daysOfWeek.split("").map(day => daysMapping[day]);

                    calendar.createEvent({
                        start: new Date(startDate.setHours(startHour + (startTime.includes("PM") && startHour < 12 ? 12 : 0), startMinute)),
                        end: new Date(startDate.setHours(endHour + (endTime.includes("PM") && endHour < 12 ? 12 : 0), endMinute)),
                        timezone: "America/Chicago",
                        summary: parsedData.title,
                        description: `Class: ${parsedData.title}`,
                        location: parsedData.lecture.split(" ").slice(-4).join(" ") || "Unknown Location",
                        repeating: {
                            freq: "WEEKLY",
                            byDay,
                            until: endDate,
                            exclude: excludedDates 
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error parsing event data:", error);
        }
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="schedule.ics"'
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
