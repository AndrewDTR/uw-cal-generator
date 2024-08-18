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

document.addEventListener('DOMContentLoaded', function () {
  var textarea = document.getElementById('classInput');
  var resultsDiv = document.querySelector('.real-one');

  textarea.addEventListener('input', function () {
    var scheduleData = parseSchedule(this.value);
    displayScheduleData(scheduleData, resultsDiv);
  });
});

// this entire thing is debug for now and there should be a nicer way of displaying data
function displayScheduleData(scheduleData, targetDiv) {
  targetDiv.innerHTML = '';

  if (Object.keys(scheduleData).length === 0) {
    targetDiv.innerHTML = '<div class="class-detail"><h3>⚠ Error understanding your schedule. Are you sure you copied and pasted the entire thing?</h3></div>';
    return;
  }

  targetDiv.innerHTML += `<h2>✅ Successfully parsed ${Object.keys(scheduleData).length} classes!</h2>`;

  for (let key in scheduleData) {
    let classInfo = scheduleData[key];
    let content = `<div class="class-detail" style="display: block;">`;
    content += `<h4>${key}</h4>`;

    if (classInfo.title) {
      content += `<p>Title: ${classInfo.title}</p>`
    }
    if (classInfo.lecture) {
      content += `<p>Lecture: ${classInfo.lecture}</p>`;
    }
    if (classInfo.discussion) {
      content += `<p>Discussion: ${classInfo.discussion}</p>`;
    }
    if (classInfo.lab) {
      content += `<p>Lab: ${classInfo.lab}</p>`;
    }
    if (classInfo.exam) {
      content += `<p>Exam: ${classInfo.exam}</p>`;
    }


    content += `</div>`;
    targetDiv.innerHTML += content;
  }
}
