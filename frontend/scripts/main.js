import { parseSchedule } from "./parseSchedule.js";

// const fallButton = document.getElementById('fall2024');
// const springButton = document.getElementById('spring2025');
// let currentTerm = "Fall 2024"

// // button term switcher
// function handleSelection(event) {
//   event.preventDefault();

//   fallButton.classList.remove('active');
//   springButton.classList.remove('active');

//   event.target.classList.add('active');

//   if (currentTerm != event.target.innerText) {
//     currentTerm = event.target.innerText;
//     console.log(currentTerm);
//   }
// }

// fallButton.addEventListener('click', handleSelection);
// springButton.addEventListener('click', handleSelection);

let infoLoaded = false;

document.addEventListener('DOMContentLoaded', function () {
    var textarea = document.getElementById('classInput');
    var resultsDiv = document.querySelector('.real-one');
    let scheduleData = {};
    let dateData = {};

    textarea.addEventListener('input', function () {
        scheduleData = parseSchedule(this.value);
        displayScheduleData(scheduleData, resultsDiv);
    });

    document.querySelector('button.btn.btn-primary').addEventListener('click', function () {
        const urlEncodedData = new URLSearchParams();
    
        for (const [key, value] of Object.entries(scheduleData)) {
            urlEncodedData.append(key, JSON.stringify(value));
        }
    
        fetch("http://localhost:3000/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: urlEncodedData.toString(),
        })
            .then(response => {
                if (response.ok) {
                    return response.blob(); 
                } else {
                    throw new Error('Network response was not ok.');
                }
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'schedule.ics'; 
                document.body.appendChild(a);
                a.click(); 
                a.remove(); 
            })
            .catch(error => console.error('Error:', error));
    });

    fetch('http://localhost:3000/api/dates')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error');
            }
            return response.json();
        })
        .then(data => {
            infoLoaded = true;
            const dateData = data;
            console.log('Fetched schedule data:', dateData);

            var currentSemesterElement = document.getElementById('current-semester');
            currentSemesterElement.innerHTML = `Current Semester Detected: ${dateData.info.semester}`;

            var breaksElement = document.getElementById('breaks');

            if (dateData.once || dateData.range) {
                var eventElement = document.createElement('div');
                eventElement.innerHTML = `<h5>Academic Breaks for this Semester:</h5>`;
                breaksElement.appendChild(eventElement);

                dateData.once.forEach(event => {
                    eventElement = document.createElement('div');
                    eventElement.innerHTML = `<strong>${event.title}</strong>: ${event.date}`;
                    breaksElement.appendChild(eventElement);
                });

                dateData.range.forEach(event => {
                    eventElement = document.createElement('div');
                    eventElement.innerHTML = `<strong>${event.title}</strong>: ${event.start_date} to ${event.end_date}`;
                    breaksElement.appendChild(eventElement);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching schedule data:', error);

            var currentSemesterElement = document.getElementById('current-semester');
            currentSemesterElement.innerHTML = `Current Semester Detected: Error`;
        });



});

// sanitize input to prevent any scripting attacks
function escapeHTML(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function displayScheduleData(scheduleData, targetDiv) {
    targetDiv.innerHTML = '';

    if (Object.keys(scheduleData).length === 0) {
        targetDiv.innerHTML = '<div class="class-detail error"><h3>⚠ Error understanding your schedule. Are you sure you copied and pasted the entire thing?</h3></div>';
        document.getElementById("download").disabled = true;
        return;
    }

    if (Object.keys(scheduleData).length == 1) {
        targetDiv.innerHTML += `<h2>✅ Successfully parsed ${Object.keys(scheduleData).length} class!</h2>`;
    } else {
        targetDiv.innerHTML += `<h2>✅ Successfully parsed ${Object.keys(scheduleData).length} classes!</h2>`;
    }
    document.getElementById("download").disabled = false;

    let content = '';
    let rowOpened = false;

    Object.keys(scheduleData).forEach((key, index) => {
        if (index % 2 === 0) {
            if (rowOpened) {
                content += '</div>';
            }
            content += '<div class="row">';
            rowOpened = true;
        }

        const classInfo = scheduleData[key];
        content += `<div class="col-md-6 class-detail card">`;
        content += `<h5>${escapeHTML(classInfo.title)}</h5>`;

        ['lecture', 'discussion', 'lab', 'exam'].forEach(field => {
            if (classInfo[field]) {
                content += `<p class="condensed">${escapeHTML(field.charAt(0).toUpperCase() + field.slice(1))}: ${escapeHTML(classInfo[field])}</p>`;
            }
        });

        content += '</div>';

        if (index === Object.keys(scheduleData).length - 1 && rowOpened) {
            content += '</div>';
            rowOpened = false;
        }
    });

    targetDiv.innerHTML += content;
}

function sendData(data) {
    const urlEncodedData = new URLSearchParams();

    for (const [key, value] of Object.entries(data)) {
        urlEncodedData.append(key, JSON.stringify(value));
    }

    fetch("http://localhost:3000/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlEncodedData.toString()
    })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
}