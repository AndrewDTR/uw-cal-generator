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
            startDate: new Date(),
            endDate: new Date()
        };
    }
};

const parseTime = (timeString, date) => {
    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const parsedDate = new Date(date);
    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
};

const adjustDateToDayOfWeek = (date, dayOfWeek) => {
    const currentDay = date.getDay(); // sunday - saturday maps to 0 - 6
    const targetDay = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(dayOfWeek);
    const dayDifference = (targetDay - currentDay + 7) % 7;
    const adjustedDate = new Date(date);
    adjustedDate.setDate(date.getDate() + dayDifference);
    return adjustedDate;
};

const addEventToCalendar = (calendar, title, location, days, startTime, endTime, startDate, endDate, excludedDates) => {
    const daysMapping = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };

    days.split('').forEach(day => {
        const dayOfWeek = daysMapping[day];
        const eventStartDate = adjustDateToDayOfWeek(new Date(startDate), dayOfWeek);
        const eventEndDate = new Date(eventStartDate);

        calendar.createEvent({
            start: parseTime(startTime, eventStartDate),
            end: parseTime(endTime, eventEndDate),
            timezone: "America/Chicago",
            summary: title,
            description: `Class: ${title}`,
            location: location,
            repeating: {
                freq: 'WEEKLY',
                byDay: [dayOfWeek],
                until: endDate,
                exclude: excludedDates
            }
        });
    });
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
                const [_, days, startTime, endTime, location] = parsedData.lecture.match(/([A-Z]+)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})\s(.+)/);
                addEventToCalendar(calendar, parsedData.title, location, days, startTime, endTime, startDate, endDate, excludedDates);
            }

            if (parsedData.discussion) {
                const [_, days, startTime, endTime, location] = parsedData.discussion.match(/([A-Z]+)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})\s(.+)/);
                addEventToCalendar(calendar, `${parsedData.title} - Discussion`, location, days, startTime, endTime, startDate, endDate, excludedDates);
            }

            if (parsedData.exam) {
                const [date, timeRange] = parsedData.exam.split(', ');
                const [startTime, endTime] = timeRange.split(' - ');
                const examDate = new Date(date);

                calendar.createEvent({
                    start: parseTime(startTime, examDate),
                    end: parseTime(endTime, examDate),
                    timezone: "America/Chicago",
                    summary: `${parsedData.title} - Exam`,
                    description: `Exam for ${parsedData.title}`,
                    location: "See course details",
                });
            }

        } catch (error) {
            console.error("Error parsing event data:", error);
        }
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="schedule.ics"');

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
