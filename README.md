# 📅 🦡 UW Calendar Generator

## Infrastructure

I, like many other students at UW-Madison, put my class schedule into apps like Google Calendar for convenience. However, this can be pretty tedious, especially when dealing with reoccuring events and school holidays. With this tool, all you have to do is paste in your course schedule, and it'll give you a formatted .ical file that you can import into the calendar app of your choice.

The frontend is just [a vanilla HTML page using Bootstrap](./frontend/index.html). I have my webserver (Caddy) with a `file_server` directive pointing into the `frontend` folder. It parses the schedule, shows it to the user, and sends it to the backend when the user downloads their schedule.

The backend, using Express, is responsible for displaying the dynamic information on the page (current semester, start date, end date, and academic breaks) and generating the `.ics` file with the corresponding events. It uses [this lovely npm package called ical-generator](https://www.npmjs.com/package/ical-generator) to create the events. On my VPS, I use pm2 to run it.

To exclude certain dates, the frontend and backend the `backend\dates.json`. It uses the following format:

```json
{
    "info": {
        "semester": "Fall 2024"
    },
    "start-end": {
        "start_date": "2024-09-04",
        "end_date": "2024-12-11"
    },
    "once": [
        {
            "title": "Labor Day",
            "date": "2024-09-02"
        }
    ],
    "range": [
        {
            "title": "Thanksgiving Recess",
            "start_date": "2024-11-28",
            "end_date": "2024-12-01"
        }
    ]
}
```
*An example `dates.json` from Fall 2024*

The `once` object takes a title and a date in `YYYY-MM-DD` format. These are for one off events that only take a single day. The `range` object takes a title, start, and end date, where every day within the range is excluded from being counted as an event. If you'd like to contribute an updated dates file for a different semester, that would be greatly appreciated! ❤️