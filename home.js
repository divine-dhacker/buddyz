document.addEventListener('DOMContentLoaded', () => {
  const pastResultsContainer = document.getElementById('past-results-container');

  function getSavedQuizzes() {
    return JSON.parse(localStorage.getItem('savedQuizzes')) || {};
  }

  const savedQuizzes = getSavedQuizzes();
  const quizIDs = Object.keys(savedQuizzes).reverse();

  if (quizIDs.length > 0) {
    pastResultsContainer.innerHTML = '<h2>Past Quiz Results</h2>';
  }

  quizIDs.forEach(quizID => {
    const quizResultContainer = document.createElement('div');
    quizResultContainer.className = 'past-quiz-result';

    const quizLink = document.createElement('a');
    quizLink.href = `bffchallenge.html?id=${quizID}`;

    const quizNameElement = document.createElement('h3');
    quizLink.appendChild(quizNameElement);

    const resultList = document.createElement('ul');

    quizResultContainer.appendChild(quizLink);
    quizResultContainer.appendChild(resultList);
    pastResultsContainer.appendChild(quizResultContainer);

    database.ref(`quizzes/${quizID}`).once('value').then(snapshot => {
      const quizData = snapshot.val();
      if (quizData) {
        quizNameElement.textContent = `${quizData.name}'s Quiz`;
        const responses = quizData.responses;
        if (responses) {
          const sortedResponses = Object.values(responses).sort((a, b) => {
            if (b.score === a.score) {
              return a.timestamp - b.timestamp; // Earliest first
            }
            return b.score - a.score; // Highest score first
          });

          resultList.innerHTML = sortedResponses.map((r, index) => {
            return `<li>#${index + 1}: <strong>${r.friendName}</strong> - ${r.score} / 15</li>`;
          }).join('');
        } else {
          resultList.innerHTML = '<li>No one has taken this quiz yet.</li>';
        }
      }
    });
  });
});
