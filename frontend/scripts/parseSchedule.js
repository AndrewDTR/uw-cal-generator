const monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function parseSchedule(scheduleText) {
    let scheduleList = scheduleText.split("\n");
    let classes = {};
    let activeClass = {};

    scheduleList.forEach(line => {
        if (line == "Courses") {
            // this is the first line of the schedule. some people might accidentally include this
        }

        let lineType = getLineType(line);

        switch (lineType) {
            case 'LEC':
                // console.log("lecture" + line);
                activeClass.lecture = line;
                break;
            case 'SEM':
                // console.log("seminar" + line);
                activeClass.seminar = line;
                break;
            case 'DIS':
                // console.log("discussion" + line);
                activeClass.discussion = line;
                break;
            case 'LAB':
                // console.log("lab " + line);
                activeClass.lab = line;
                break;
            case 'EXAM':
                // console.log("exam date" + line);
                activeClass.exam = line;
                break;
            case 'COURSE_TITLE':
                // console.log("course title " + line);
                if (activeClass.title && (activeClass.lab || activeClass.lecture || activeClass.discussion)) {
                    // make the json object's class title be alphanumeric, to stop any weirdness with colons etc. in their titles
                    classes[activeClass.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()] = activeClass;
                    activeClass = {};
                }
                activeClass.title = line;
                break;
            default:
                break;
        }
    });

    // save the last class, if any
    if (activeClass.title && (activeClass.lab || activeClass.lecture || activeClass.discussion || activeClass.seminar)) {
        classes[activeClass.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()] = activeClass;
    }

    return classes;
}

// helper method for switch statement above to determine line type
function getLineType(line) {
    if (line.startsWith("LEC")) {
        return 'LEC';
    } else if (line.startsWith("DIS")) {
        return 'DIS';
    } else if (line.startsWith("LAB")) {
        return 'LAB';
    } else if (line.startsWith("SEM")) {
        return 'SEM';
    } else if (monthList.some(month => line.startsWith(month))) {
        return 'EXAM';
    } else if (line != "" && !line.startsWith("Weekly Meetings") && !line.startsWith("Exams") &&
        !line.startsWith("None provided") && !line.startsWith("This course may have")) {
        return 'COURSE_TITLE';
    } else {
        return 'IGNORE';
    }
}
