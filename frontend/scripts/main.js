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
      targetDiv.innerHTML = '<div class="class-detail error"><h3>⚠ Error understanding your schedule. Are you sure you copied and pasted the entire thing?</h3></div>';
      return;
  }

  targetDiv.innerHTML += `<h2>✅ Successfully parsed ${Object.keys(scheduleData).length} classes!</h2>`;
  
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
      content += `<h5>${classInfo.title}</h5>`;

      ['lecture', 'discussion', 'lab', 'exam'].forEach(field => {
          if (classInfo[field]) {
              content += `<p class="condensed">${field.charAt(0).toUpperCase() + field.slice(1)}: ${classInfo[field]}</p>`;
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
