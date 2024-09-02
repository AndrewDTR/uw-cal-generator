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

    if (modifier === 'AM' && hours < 12 && hours !== 0) hours += 0; 

    const parsedDate = new Date(date);
    parsedDate.setHours(hours, minutes, 0, 0);
    console.log(`Parsed time: ${parsedDate}`);  
    return parsedDate;
};

const parseDateWithYear = (dateString, year) => {
    const [month, day] = dateString.split(' ');
    const monthMap = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11
    };
    return new Date(year, monthMap[month], parseInt(day));
};

const addEventToCalendar = (calendar, title, location, days, startTime, endTime, startDate, endDate, excludedDates) => {
    const daysMapping = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };

    days.split('').forEach(day => {
        const dayOfWeek = daysMapping[day];
        const eventStartDate = new Date(startDate);
        const currentDay = eventStartDate.getDay();
        const targetDay = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(dayOfWeek);
        const dayDifference = (targetDay - currentDay + 7) % 7;

        eventStartDate.setDate(eventStartDate.getDate() + dayDifference);
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
    const currentYear = new Date().getFullYear();

    for (const key in req.body) {
        try {
            const parsedData = JSON.parse(req.body[key]);
            console.log(`Processing course: ${parsedData.title}`);

            if (parsedData.lecture) {
                const [_, days, startTime, endTime, location] = parsedData.lecture.match(/([A-Z]+)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})\s(.+)/);
                addEventToCalendar(calendar, parsedData.title, location, days, startTime, endTime, startDate, endDate, excludedDates);
            }

            if (parsedData.discussion) {
                const [_, days, startTime, endTime, location] = parsedData.discussion.match(/([A-Z]+)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})\s(.+)/);
                addEventToCalendar(calendar, `${parsedData.title} - Discussion`, location, days, startTime, endTime, startDate, endDate, excludedDates);
            }

            if (parsedData.lab) {
                const [_, days, startTime, endTime, location] = parsedData.lab.match(/([A-Z]+)\s(\d{1,2}:\d{2} [APM]{2})\s-\s(\d{1,2}:\d{2} [APM]{2})\s(.+)/);
                addEventToCalendar(calendar, `${parsedData.title} - Lab`, location, days, startTime, endTime, startDate, endDate, excludedDates);
            }

            if (parsedData.exam) {
                console.log(`Found exam for course: ${parsedData.title}`);
                try {
                    const [date, timeRange] = parsedData.exam.split(', ');
                    const [startTime, endTime] = timeRange.split(' - ');

                    const examDate = parseDateWithYear(date, currentYear);

                    const examStartDate = parseTime(startTime, examDate);
                    const examEndDate = parseTime(endTime, examDate);

                    console.log(`Creating exam event for: ${parsedData.title}`);
                    calendar.createEvent({
                        start: examStartDate,
                        end: examEndDate,
                        timezone: "America/Chicago",
                        summary: `${parsedData.title} - Exam`,
                        description: `Exam for ${parsedData.title}`,
                        location: "See course details",
                    });
                } catch (error) {
                    console.error(`Error processing exam for ${parsedData.title}:`, error);
                }
            } else {
                console.log(`No exam found for course: ${parsedData.title}`);
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
