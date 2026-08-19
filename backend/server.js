const express = require("express");
const ical = require("ical-generator").default;
const { ICalCalendarMethod } = require("ical-generator");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  origin: "https://schedule.amoses.dev",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

const loadExcludedDates = () => {
  const filePath = path.join(__dirname, "dates.json");
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const excludedDates = [];

    if (data.once) {
      excludedDates.push(
        ...data.once.map((event) => new Date(event.date + "T00:00:00")),
      );
    }

    if (data.range) {
      data.range.forEach((event) => {
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
      endDate: new Date(data["start-end"].end_date + "T23:59:59"),
    };
  } catch (err) {
    console.error("Error loading semester dates:", err);
    return {
      startDate: new Date(),
      endDate: new Date(),
    };
  }
};

const parseTime = (timeString, date) => {
  const [time, modifier] = timeString.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const parsedDate = new Date(date);
  parsedDate.setHours(hours, minutes, 0, 0);
  return parsedDate;
};

const parseDateWithYear = (dateString, year) => {
  const [month, day] = dateString.trim().split(/\s+/);
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
    December: 11,
  };
  if (monthMap[month] === undefined) return null;
  return new Date(year, monthMap[month], parseInt(day));
};

const resolveExamDate = (dateString, startDate, endDate) => {
  const windowEnd = new Date(endDate);
  windowEnd.setDate(windowEnd.getDate() + 21);

  for (const year of new Set([
    startDate.getFullYear(),
    endDate.getFullYear(),
  ])) {
    const candidate = parseDateWithYear(dateString, year);
    if (candidate && candidate >= startDate && candidate <= windowEnd)
      return candidate;
  }
  return parseDateWithYear(dateString, startDate.getFullYear());
};

const makeUid = (parts) =>
  parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") + "@schedule.amoses.dev";

const ICAL_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const addEventToCalendar = (
  calendar,
  title,
  location,
  days,
  startTime,
  endTime,
  startDate,
  endDate,
  excludedDates,
) => {
  const daysMapping = { M: "MO", T: "TU", W: "WE", R: "TH", F: "FR" };

  const daysOfWeek = days
    .split("")
    .map((day) => daysMapping[day])
    .filter(Boolean);
  if (daysOfWeek.length === 0) {
    console.error(`No valid meeting days in "${days}" for ${title}`);
    return;
  }

  let firstEventDate = new Date(startDate);
  let foundFirstDay = false;

  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(ICAL_DAYS[firstEventDate.getDay()])) {
      foundFirstDay = true;
      break;
    }
    firstEventDate.setDate(firstEventDate.getDate() + 1);
  }

  if (foundFirstDay) {
    const adjustedExcludedDates = excludedDates
      .filter((date) => daysOfWeek.includes(ICAL_DAYS[date.getDay()]))
      .map((date) => parseTime(startTime, date));

    calendar.createEvent({
      id: makeUid([title, days, startTime]),
      start: parseTime(startTime, firstEventDate),
      end: parseTime(endTime, firstEventDate),
      timezone: "America/Chicago",
      summary: title,
      description: `Class: ${title}`,
      location: location,
      repeating: {
        freq: "WEEKLY",
        byDay: daysOfWeek,
        until: endDate,
        ...(adjustedExcludedDates.length > 0
          ? { exclude: adjustedExcludedDates }
          : {}),
      },
    });
  } else {
    console.error(
      `No valid day found for the initial event in the days: ${days}`,
    );
  }
};

const MEETING_RE =
  /([A-Z]+)\s(\d{1,2}:\d{2} (?:AM|PM))\s-\s(\d{1,2}:\d{2} (?:AM|PM))\s(.+)/;

app.post("/", (req, res) => {
  const calendar = ical({ name: "Class Schedule" });

  calendar.method(ICalCalendarMethod.PUBLISH);

  const { startDate, endDate } = loadSemesterDates();
  const excludedDates = loadExcludedDates();

  for (const key in req.body) {
    let parsedData;
    try {
      parsedData = JSON.parse(req.body[key]);
    } catch (error) {
      console.error(`Skipping unparseable course entry "${key}"`);
      continue;
    }

    console.log(`Processing course: ${parsedData.title}`);

    try {
      if (parsedData.lecture) {
        const [_, days, startTime, endTime, location] =
          parsedData.lecture.match(MEETING_RE);
        addEventToCalendar(
          calendar,
          parsedData.title,
          location,
          days,
          startTime,
          endTime,
          startDate,
          endDate,
          excludedDates,
        );
      }
    } catch (error) {
      console.error("Error parsing event data:", error);
    }

    try {
      if (parsedData.discussion) {
        const [_, days, startTime, endTime, location] =
          parsedData.discussion.match(MEETING_RE);
        addEventToCalendar(
          calendar,
          `${parsedData.title} - Discussion`,
          location,
          days,
          startTime,
          endTime,
          startDate,
          endDate,
          excludedDates,
        );
      }
    } catch (error) {
      console.error("Error parsing event data:", error);
    }

    try {
      if (parsedData.seminar) {
        const [_, days, startTime, endTime, location] =
          parsedData.seminar.match(MEETING_RE);
        addEventToCalendar(
          calendar,
          `${parsedData.title} - Seminar`,
          location,
          days,
          startTime,
          endTime,
          startDate,
          endDate,
          excludedDates,
        );
      }
    } catch (error) {
      console.error("Error parsing event data:", error);
    }

    try {
      if (parsedData.lab) {
        const [_, days, startTime, endTime, location] =
          parsedData.lab.match(MEETING_RE);
        addEventToCalendar(
          calendar,
          `${parsedData.title} - Lab`,
          location,
          days,
          startTime,
          endTime,
          startDate,
          endDate,
          excludedDates,
        );
      }
    } catch (error) {
      console.error("Error parsing event data:", error);
    }

    if (parsedData.exam) {
      try {
        const [date, timeRange] = parsedData.exam.split(", ");
        const [startTime, endTime] = timeRange.split(" - ");

        const examDate = resolveExamDate(date, startDate, endDate);
        if (!examDate) throw new Error(`could not resolve exam date "${date}"`);

        calendar.createEvent({
          id: makeUid([parsedData.title, "exam", date]),
          start: parseTime(startTime, examDate),
          end: parseTime(endTime, examDate),
          timezone: "America/Chicago",
          summary: `${parsedData.title} - Exam`,
          description: `Exam for ${parsedData.title}`,
          location: "See course details",
        });
      } catch (error) {
        console.error(`Error processing exam for ${parsedData.title}:`, error);
      }
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

    try {
      res.status(200).json(JSON.parse(data));
    } catch (parseErr) {
      console.error("dates.json is not valid JSON:", parseErr.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

app.listen(1111, () => {
  console.log("Server is running on port 1111");
});
