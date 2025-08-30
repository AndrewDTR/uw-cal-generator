const MONTHS_RE =
    /January|February|March|April|May|June|July|August|September|October|November|December/;

const bullets = /^\s*(?:[-–—•▪◦*]\s*)+/;
const enumPrefix = /^\s*\d+\.\s*/;
const WS_RE = /\s+/g;

function normalizeLine(line) {
    return line
        .replace(/\r/g, "")
        .replace(/\u00A0/g, " ")
        .replace(bullets, "")
        .replace(enumPrefix, "")
        .trim()
        .replace(WS_RE, " ");
}

const COURSE_RE =
    /^([A-Z][A-Z&\s]{1,}\s+\d{3}[A-Z]?):\s*(.+)$/;

const MEETING_RE =
    /^(LEC|DIS|LAB|SEM)\s+(\d{3}[A-Z]?)\s+([MTWRFSU]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s+(.+)$/;

const EXAM_RE =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s*-\s*(.*))?$/;

function tokenizeLine(rawLine) {
    const line = normalizeLine(rawLine);
    if (!line) return { type: "IGNORE" };

    let m;
    if ((m = line.match(COURSE_RE))) {
        return { type: "COURSE", code: m[1], title: m[2], display: line };
    }
    if ((m = line.match(MEETING_RE))) {
        return {
            type: "MEETING",
            kind: m[1],
            section: m[2],
            days: m[3],
            start: m[4],
            end: m[5],
            location: m[6],
            display: line
        };
    }
    if ((m = line.match(EXAM_RE))) {
        return {
            type: "EXAM",
            month: m[1],
            day: m[2],
            start: m[3],
            end: m[4],
            location: m[5] || "",
            display: line
        };
    }
    return { type: "IGNORE" };
}

export function parseSchedule(scheduleText) {
    const classes = {};
    let active = null;

    for (const raw of scheduleText.split("\n")) {
        const tok = tokenizeLine(raw);

        if (tok.type === "COURSE") {
            if (active && (active.lecture || active.lab || active.discussion || active.seminar)) {
                classes[active.key] = active;
            }
            const title = tok.display;
            active = {
                title,
                key: title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
            };
            continue;
        }

        if (!active) continue;

        if (tok.type === "MEETING") {
            const line = `${tok.kind} ${tok.section} ${tok.days} ${tok.start} - ${tok.end} ${tok.location}`;
            const slot = tok.kind.toLowerCase();
            if (slot === "lec") active.lecture = line;
            else if (slot === "dis") active.discussion = line;
            else if (slot === "lab") active.lab = line;
            else if (slot === "sem") active.seminar = line;
            continue;
        }

        if (tok.type === "EXAM") {
            const line = `${tok.month} ${tok.day}, ${tok.start} - ${tok.end}${tok.location ? " - " + tok.location : ""}`;
            active.exam = line;
            continue;
        }
    }

    if (active && (active.lecture || active.lab || active.discussion || active.seminar)) {
        classes[active.key] = active;
    }
    return classes;
}
