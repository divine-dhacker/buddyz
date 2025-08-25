document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-quiz');
  const quizContainer = document.getElementById('quiz-container');
  const nameContainer = document.getElementById('name-container');
  const shareContainer = document.getElementById('share-container');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const shareBtn = document.getElementById('share-btn');
  const quizLinkInput = document.getElementById('quiz-link');

  /* The Questions start from here and make sure they are 50 */
  let allQuestions = [
    {
      question: "Coffee or tea?",
      options: [
        { text: "Coffee", image: "../assets/coffee.png" },
        { text: "Tea", image: "../assets/tea.png" },
        { text: "Both", image: "../assets/both.png" },
        { text: "Neither", image: "../assets/neither.png" }
      ]
    },
    {
      question: "Morning person or night owl?",
      options: [
        { text: "Morning person", image: "../assets/morning.png" },
        { text: "Night owl", image: "../assets/night.png" },
        { text: "In between", image: "../assets/inbetween.png" },
        { text: "Depends on the day", image: "../assets/depends.png" }
      ]
    },
    {
      question: "Favorite way to spend a lazy Sunday?",
      options: [
        { text: "Reading", image: "../assets/reading.png" },
        { text: "Watching movies", image: "../assets/movies.png" },
        { text: "Going for a walk", image: "../assets/walk.png" },
        { text: "Sleeping in", image: "../assets/sleep.png" }
      ]
    },
    {
      question: "Best advice you've ever received?",
      options: [
        { text: "Follow your heart", image: "../assets/followheart.png" },
        { text: "Work hard", image: "../assets/workhard.png" },
        { text: "Be kind", image: "../assets/bekind.png" },
        { text: "Take risks", image: "../assets/takerisks.png" }
      ]
    },
    {
      question: "Dream travel destination?",
      options: [
        { text: "Paris", image: "../assets/paris.png" },
        { text: "Tokyo", image: "../assets/tokyo.png" },
        { text: "New York", image: "../assets/newyork.png" },
        { text: "Bali", image: "../assets/bali.png" }
      ]
    },
    {
      question: "What’s your favorite dessert?",
      options: [
        { text: "Cake", image: "../assets/cake.png" },
        { text: "Ice cream", image: "../assets/icecream.png" },
        { text: "Chocolate", image: "../assets/chocolate.png" },
        { text: "Cookies", image: "../assets/cookies.png" }
      ]
    },
    {
      question: "What’s your zodiac sign?",
      options: [
        { text: "Leo", image: "../assets/leo.png" },
        { text: "Scorpio", image: "../assets/scorpio.png" },
        { text: "Gemini", image: "../assets/gemini.png" },
        { text: "Capricorn", image: "../assets/capricorn.png" }
      ]
    },
    {
      question: "What’s your favorite color?",
      options: [
        { text: "Blue", image: "../assets/blue.png" },
        { text: "Red", image: "../assets/red.png" },
        { text: "Green", image: "../assets/green.png" },
        { text: "Purple", image: "../assets/purple.png" }
      ]
    },
    {
      question: "Go-to comfort food?",
      options: [
        { text: "Pizza", image: "../assets/pizza.png" },
        { text: "Burger", image: "../assets/burger.png" },
        { text: "Fries", image: "../assets/fries.png" },
        { text: "Rice & Stew", image: "../assets/rice.png" }
      ]
    },
    {
      question: "What’s your biggest fear?",
      options: [
        { text: "Heights", image: "../assets/heights.png" },
        { text: "Darkness", image: "../assets/darkness.png" },
        { text: "Snakes", image: "../assets/snakes.png" },
        { text: "Failure", image: "../assets/failure.png" }
      ]
    },
    {
      question: "Ideal vacation type?",
      options: [
        { text: "Beach", image: "../assets/beach.png" },
        { text: "Mountains", image: "../assets/mountains.png" },
        { text: "City", image: "../assets/city.png" },
        { text: "Countryside", image: "../assets/countryside.png" }
      ]
    },
    {
      question: "How do you express love?",
      options: [
        { text: "Words", image: "../assets/words.png" },
        { text: "Gifts", image: "../assets/gifts.png" },
        { text: "Time", image: "../assets/time.png" },
        { text: "Touch", image: "../assets/touch.png" }
      ]
    },
    {
      question: "Favorite hobby?",
      options: [
        { text: "Dancing", image: "../assets/dancing.png" },
        { text: "Drawing", image: "../assets/drawing.png" },
        { text: "Gaming", image: "../assets/gaming.png" },
        { text: "Singing", image: "../assets/singing.png" }
      ]
    },
    {
      question: "How do you handle stress?",
      options: [
        { text: "Talk it out", image: "../assets/talk.png" },
        { text: "Sleep", image: "../assets/sleepstress.png" },
        { text: "Music", image: "../assets/music.png" },
        { text: "Cry", image: "../assets/cry.png" }
      ]
    },
    {
      question: "Favorite social media app?",
      options: [
        { text: "Instagram", image: "../assets/instagram.png" },
        { text: "TikTok", image: "../assets/tiktok.png" },
        { text: "Snapchat", image: "../assets/snapchat.png" },
        { text: "Twitter", image: "../assets/twitter.png" }
      ]
    },
    {
      question: "Dog person or cat person?",
      options: [
        { text: "Dog", image: "../assets/dog.png" },
        { text: "Cat", image: "../assets/cat.png" },
        { text: "Both", image: "../assets/bothpets.png" },
        { text: "Neither", image: "../assets/neitherpet.png" }
      ]
    },
    {
      question: "Favorite genre of music?",
      options: [
        { text: "Pop", image: "../assets/pop.png" },
        { text: "Afrobeat", image: "../assets/afrobeat.png" },
        { text: "Rap", image: "../assets/rap.png" },
        { text: "Gospel", image: "../assets/gospel.png" }
      ]
    },
    {
      question: "What superpower would you want?",
      options: [
        { text: "Invisibility", image: "../assets/invisibility.png" },
        { text: "Flying", image: "../assets/flying.png" },
        { text: "Time travel", image: "../assets/timetravel.png" },
        { text: "Mind reading", image: "../assets/mindreading.png" }
      ]
    },
    {
      question: "Choose a party vibe:",
      options: [
        { text: "Loud & crazy", image: "../assets/loud.png" },
        { text: "Chill & fun", image: "../assets/chill.png" },
        { text: "Games & dance", image: "../assets/games.png" },
        { text: "No parties", image: "../assets/noparty.png" }
      ]
    },
    {
      question: "Introvert or extrovert?",
      options: [
        { text: "Introvert", image: "../assets/introvert.png" },
        { text: "Extrovert", image: "../assets/extrovert.png" },
        { text: "Ambivert", image: "../assets/ambivert.png" },
        { text: "Depends", image: "../assets/dependsmood.png" }
      ]
    },

    {
      question: "What’s your favorite season?",
      options: [
        { text: "Spring", image: "../assets/spring.png" },
        { text: "Summer", image: "../assets/summer.png" },
        { text: "Autumn", image: "../assets/autumn.png" },
        { text: "Winter", image: "../assets/winter.png" }
      ]
    },
    {
      question: "What’s your ideal date?",
      options: [
        { text: "Movie night", image: "../assets/moviedate.png" },
        { text: "Dinner out", image: "../assets/dinner.png" },
        { text: "Beach walk", image: "../assets/beachwalk.png" },
        { text: "Game night", image: "../assets/gamenight.png" }
      ]
    },
    {
      question: "What's your fashion style?",
      options: [
        { text: "Trendy", image: "../assets/trendy.png" },
        { text: "Casual", image: "../assets/casual.png" },
        { text: "Sporty", image: "../assets/sporty.png" },
        { text: "Classy", image: "../assets/classy.png" }
      ]
    },
    {
      question: "Favorite type of movie?",
      options: [
        { text: "Comedy", image: "../assets/comedy.png" },
        { text: "Horror", image: "../assets/horror.png" },
        { text: "Romance", image: "../assets/romance.png" },
        { text: "Action", image: "../assets/action.png" }
      ]
    },
    {
      question: "What’s your dream job?",
      options: [
        { text: "Actor", image: "../assets/actor.png" },
        { text: "Doctor", image: "../assets/doctor.png" },
        { text: "Entrepreneur", image: "../assets/entrepreneur.png" },
        { text: "Artist", image: "../assets/artist.png" }
      ]
    },
    {
      question: "What motivates you the most?",
      options: [
        { text: "Success", image: "../assets/success.png" },
        { text: "Family", image: "../assets/family.png" },
        { text: "Money", image: "../assets/money.png" },
        { text: "Happiness", image: "../assets/happiness.png" }
      ]
    },
    {
      question: "Which phone do you prefer?",
      options: [
        { text: "iPhone", image: "../assets/iphone.png" },
        { text: "Android", image: "../assets/android.png" },
        { text: "Both", image: "../assets/bothphones.png" },
        { text: "Neither", image: "../assets/none.png" }
      ]
    },
    {
      question: "Pick a breakfast meal:",
      options: [
        { text: "Pancakes", image: "../assets/pancakes.png" },
        { text: "Cereal", image: "../assets/cereal.png" },
        { text: "Toast", image: "../assets/toast.png" },
        { text: "Eggs", image: "../assets/eggs.png" }
      ]
    },
    {
      question: "Favorite holiday?",
      options: [
        { text: "Christmas", image: "../assets/christmas.png" },
        { text: "New Year", image: "../assets/newyear.png" },
        { text: "Easter", image: "../assets/easter.png" },
        { text: "Valentine’s", image: "../assets/valentine.png" }
      ]
    },
    {
      question: "What do you value most in a friend?",
      options: [
        { text: "Loyalty", image: "../assets/loyalty.png" },
        { text: "Honesty", image: "../assets/honesty.png" },
        { text: "Support", image: "../assets/support.png" },
        { text: "Humor", image: "../assets/humor.png" }
      ]
    },
    {
      question: "Choose a mode of transport:",
      options: [
        { text: "Car", image: "../assets/car.png" },
        { text: "Bike", image: "../assets/bike.png" },
        { text: "Plane", image: "../assets/plane.png" },
        { text: "Train", image: "../assets/train.png" }
      ]
    },
    {
      question: "What’s your favorite snack?",
      options: [
        { text: "Chips", image: "../assets/chips.png" },
        { text: "Popcorn", image: "../assets/popcorn.png" },
        { text: "Fruit", image: "../assets/fruit.png" },
        { text: "Nuts", image: "../assets/nuts.png" }
      ]
    },
    {
      question: "Your favorite time of day?",
      options: [
        { text: "Morning", image: "../assets/morningtime.png" },
        { text: "Afternoon", image: "../assets/afternoon.png" },
        { text: "Evening", image: "../assets/evening.png" },
        { text: "Night", image: "../assets/nighttime.png" }
      ]
    },
    {
      question: "What scares you the most?",
      options: [
        { text: "Losing loved ones", image: "../assets/loss.png" },
        { text: "Being alone", image: "../assets/alone.png" },
        { text: "The future", image: "../assets/future.png" },
        { text: "The unknown", image: "../assets/unknown.png" }
      ]
    },
    {
      question: "If you could live anywhere, where would it be?",
      options: [
        { text: "Island", image: "../assets/island.png" },
        { text: "City", image: "../assets/cityplace.png" },
        { text: "Village", image: "../assets/village.png" },
        { text: "Mountains", image: "../assets/mountplace.png" }
      ]
    },
    {
      question: "Your favorite beverage?",
      options: [
        { text: "Soda", image: "../assets/soda.png" },
        { text: "Juice", image: "../assets/juice.png" },
        { text: "Water", image: "../assets/water.png" },
        { text: "Milkshake", image: "../assets/milkshake.png" }
      ]
    },
    {
      question: "Which would you rather have?",
      options: [
        { text: "Fame", image: "../assets/fame.png" },
        { text: "Power", image: "../assets/power.png" },
        { text: "Love", image: "../assets/love.png" },
        { text: "Wisdom", image: "../assets/wisdom.png" }
      ]
    },
    {
      question: "Favorite board game?",
      options: [
        { text: "Chess", image: "../assets/chess.png" },
        { text: "Ludo", image: "../assets/ludo.png" },
        { text: "Monopoly", image: "../assets/monopoly.png" },
        { text: "Scrabble", image: "../assets/scrabble.png" }
      ]
    },
    {
      question: "Pick a talent you’d love to have:",
      options: [
        { text: "Sing", image: "../assets/talentsing.png" },
        { text: "Dance", image: "../assets/talentdance.png" },
        { text: "Paint", image: "../assets/talentpaint.png" },
        { text: "Play instrument", image: "../assets/instrument.png" }
      ]
    },
    {
      question: "What type of books do you like?",
      options: [
        { text: "Romance", image: "../assets/bookromance.png" },
        { text: "Mystery", image: "../assets/bookmystery.png" },
        { text: "Self-help", image: "../assets/bookselfhelp.png" },
        { text: "Fantasy", image: "../assets/bookfantasy.png" }
      ]
    },
    {
    question: "What's your favorite type of weather?",
    options: [
      { text: "Sunny", image: "../assets/sunny.png" },
      { text: "Rainy", image: "../assets/rainy.png" },
      { text: "Cloudy", image: "../assets/cloudy.png" },
      { text: "Snowy", image: "../assets/snowy.png" }
    ]
  },
  {
    question: "How do you like to celebrate your birthday?",
    options: [
      { text: "Big party", image: "../assets/party.png" },
      { text: "Small gathering", image: "../assets/smallgathering.png" },
      { text: "Solo day", image: "../assets/soloday.png" },
      { text: "Adventure trip", image: "../assets/adventure.png" }
    ]
  },
  {
    question: "What’s your ideal weekend?",
    options: [
      { text: "Relax at home", image: "../assets/relax.png" },
      { text: "Go out with friends", image: "../assets/friends.png" },
      { text: "Explore nature", image: "../assets/nature.png" },
      { text: "Catch up on hobbies", image: "../assets/hobbies.png" }
    ]
  },
  {
    question: "What kind of books do you prefer?",
    options: [
      { text: "Romance", image: "../assets/book_romance.png" },
      { text: "Thriller", image: "../assets/book_thriller.png" },
      { text: "Fantasy", image: "../assets/book_fantasy.png" },
      { text: "Biography", image: "../assets/book_bio.png" }
    ]
  },
  {
    question: "Pick a pet you’d love to have:",
    options: [
      { text: "Dog", image: "../assets/dog.png" },
      { text: "Cat", image: "../assets/cat.png" },
      { text: "Bird", image: "../assets/bird.png" },
      { text: "Fish", image: "../assets/fish.png" }
    ]
  },
  {
    question: "Favorite school subject?",
    options: [
      { text: "Math", image: "../assets/math.png" },
      { text: "Art", image: "../assets/art.png" },
      { text: "History", image: "../assets/history.png" },
      { text: "Science", image: "../assets/science.png" }
    ]
  },
  {
    question: "How do you start your day?",
    options: [
      { text: "Coffee first", image: "../assets/coffee.png" },
      { text: "Workout", image: "../assets/workout.png" },
      { text: "Scrolling phone", image: "../assets/phone.png" },
      { text: "Meditation", image: "../assets/meditation.png" }
    ]
  },
  {
    question: "Choose a hobby to try:",
    options: [
      { text: "Photography", image: "../assets/photography.png" },
      { text: "Cooking", image: "../assets/cooking.png" },
      { text: "Writing", image: "../assets/writing.png" },
      { text: "Yoga", image: "../assets/yoga.png" }
    ]
  },
  {
    question: "What's your dream car?",
    options: [
      { text: "Tesla", image: "../assets/tesla.png" },
      { text: "Ferrari", image: "../assets/ferrari.png" },
      { text: "SUV", image: "../assets/suv.png" },
      { text: "Motorbike", image: "../assets/bike.png" }
    ]
  },
  {
    question: "Pick a type of shoe:",
    options: [
      { text: "Sneakers", image: "../assets/sneakers.png" },
      { text: "Boots", image: "../assets/boots.png" },
      { text: "Heels", image: "../assets/heels.png" },
      { text: "Sandals", image: "../assets/sandals.png" }
    ]
  },
  {
    question: "Which fictional world would you live in?",
    options: [
      { text: "Harry Potter", image: "../assets/harrypotter.png" },
      { text: "Marvel", image: "../assets/marvel.png" },
      { text: "Star Wars", image: "../assets/starwars.png" },
      { text: "Avatar", image: "../assets/avatar.png" }
    ]
  },
  {
    question: "What do you value most in friendship?",
    options: [
      { text: "Loyalty", image: "../assets/loyalty.png" },
      { text: "Humor", image: "../assets/humor.png" },
      { text: "Support", image: "../assets/support.png" },
      { text: "Fun", image: "../assets/fun.png" }
    ]
  },
  {
    question: "Which game do you enjoy most?",
    options: [
      { text: "Board games", image: "../assets/boardgames.png" },
      { text: "Video games", image: "../assets/videogames.png" },
      { text: "Card games", image: "../assets/cardgames.png" },
      { text: "Sports", image: "../assets/sports.png" }
    ]
  },
  {
    question: "What's your guilty pleasure?",
    options: [
      { text: "Binge watching", image: "../assets/bingewatch.png" },
      { text: "Junk food", image: "../assets/junkfood.png" },
      { text: "Online shopping", image: "../assets/shopping.png" },
      { text: "Staying up late", image: "../assets/late.png" }
    ]
  },
  {
    question: "What's your creative outlet?",
    options: [
      { text: "Painting", image: "../assets/painting.png" },
      { text: "Music", image: "../assets/music.png" },
      { text: "Writing", image: "../assets/writing.png" },
      { text: "Crafting", image: "../assets/crafting.png" }
    ]
  },
  {
    question: "What’s your lucky number?",
    options: [
      { text: "7", image: "../assets/7.png" },
      { text: "3", image: "../assets/3.png" },
      { text: "13", image: "../assets/13.png" },
      { text: "21", image: "../assets/21.png" }
    ]
  },
  {
    question: "Choose a city to live in:",
    options: [
      { text: "Lagos", image: "../assets/lagos.png" },
      { text: "London", image: "../assets/london.png" },
      { text: "Dubai", image: "../assets/dubai.png" },
      { text: "Cape Town", image: "../assets/capetown.png" }
    ]
  },
  {
    question: "What makes you feel alive?",
    options: [
      { text: "Adventure", image: "../assets/adventure2.png" },
      { text: "Music", image: "../assets/music.png" },
      { text: "Love", image: "../assets/love.png" },
      { text: "Success", image: "../assets/success.png" }
    ]
  },
  {
    question: "What do you do when you're bored?",
    options: [
      { text: "Watch TV", image: "../assets/watchtv.png" },
      { text: "Sleep", image: "../assets/sleep.png" },
      { text: "Scroll social media", image: "../assets/scroll.png" },
      { text: "Call a friend", image: "../assets/callfriend.png" }
    ]
  },
  {
    question: "Pick a snack:",
    options: [
      { text: "Chips", image: "../assets/chips.png" },
      { text: "Candy", image: "../assets/candy.png" },
      { text: "Fruits", image: "../assets/fruits.png" },
      { text: "Biscuits", image: "../assets/biscuits.png" }
    ]
  }
  ];

  /* The Questions ends here and make sure they are 50 */

  let quizQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = [];

  // Shuffle array and get first 15 questions
  function getRandomQuestions() {
    return [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 15);
  }

  // Start quiz
  startBtn.addEventListener('click', () => {
    const userName = document.getElementById('user-name').value.trim();
    if (!userName) {
      alert("Please enter your name to start the quiz.");
      return;
    }

    nameContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    quizQuestions = getRandomQuestions();
    currentQuestionIndex = 0;
    userAnswers = [];

    renderQuestion();
    nextBtn.style.display = 'block';
    submitBtn.style.display = 'none';
  });

  // Render a question with image options
  function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    const questionContainer = document.getElementById('question-container');

    questionContainer.innerHTML = `
      <h3>${currentQuestionIndex + 1}. ${question.question}</h3>
      <div class="quiz-options">
        ${question.options.map(option => `
          <div class="quiz-option" data-value="${option.text}">
            <img src="${option.image}" alt="${option.text}">
            <div class="option-label">${option.text}</div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.quiz-option').forEach(optionEl => {
      optionEl.addEventListener('click', () => {
        // Clear previous selections and feedback
        document.querySelectorAll('.quiz-option').forEach(el => {
          el.classList.remove('selected', 'correct', 'wrong');
        });

        optionEl.classList.add('selected');

        const selectedValue = optionEl.dataset.value;
        const correctValue = quizQuestions[currentQuestionIndex].correctAnswer;

        if (typeof correctValue !== 'undefined') {
          if (selectedValue === correctValue) {
            optionEl.classList.add('correct');
          } else {
            optionEl.classList.add('wrong');
          }
        }
      });
    });
  }

  // Get selected answer
  function getSelectedAnswer() {
    const selected = document.querySelector('.quiz-option.selected');
    return selected ? selected.dataset.value : null;
  }

  // Next button logic
  nextBtn.addEventListener('click', () => {
    const selectedAnswer = getSelectedAnswer();
    if (!selectedAnswer) {
      alert("Please select an answer before proceeding.");
      return;
    }

    userAnswers.push({
      question: quizQuestions[currentQuestionIndex].question,
      answer: selectedAnswer
    });

    currentQuestionIndex++;

    if (currentQuestionIndex < quizQuestions.length) {
      renderQuestion();
    } else {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'block';
    }
  });

  // Submit quiz
  submitBtn.addEventListener('click', () => {
    // Friend's submission
    if (window.friendQuizID) {
      let score = 0;
      for (let i = 0; i < userAnswers.length; i++) {
        if (userAnswers[i].answer === window.correctAnswers[i]) {
          score++;
        }
      }

      const response = {
        friendName: window.friendName,
        score: score,
        timestamp: Date.now()
      };

      database.ref(`quizzes/${window.friendQuizID}/responses`).push(response)
        .then(() => {
          console.log("Response saved successfully!");
          // Hide quiz and show result board
          quizContainer.style.display = 'none';
          displayResultBoard(window.friendQuizID);
        })
        .catch(error => {
          console.error("Error saving response: ", error);
        });

    } else { // Creator's submission
      const userName = document.getElementById('user-name').value.trim();
      const quizID = generateQuizID();

      // Save quiz to Firebase
      database.ref('quizzes/' + quizID).set({
        name: userName,
        answers: userAnswers
      }).then(() => {
        console.log("Quiz saved successfully!");
        saveQuiz(quizID);

        // Display share link
        quizLinkInput.value = `${window.location.origin}${window.location.pathname}?id=${quizID}`;
        shareContainer.style.display = 'block';
        quizContainer.style.display = 'none';

        // Show friend results (if any)
        displayResultBoard(quizID);
      }).catch((error) => {
        console.error("Error saving quiz: ", error);
      });
    }
  });

  function displayResultBoard(quizID) {
    const resultBoardContainer = document.getElementById('result-board-container');
    const resultList = document.getElementById('result-list');

    database.ref(`quizzes/${quizID}/responses`).once('value').then(snapshot => {
      const responses = snapshot.val();
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

        resultBoardContainer.style.display = 'block';
      }
    });
  }

  // Generate quiz ID
  function generateQuizID(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function getSavedQuizzes() {
    return JSON.parse(localStorage.getItem('savedQuizzes')) || {};
  }

  function saveQuiz(quizID) {
    const savedQuizzes = getSavedQuizzes();
    savedQuizzes[quizID] = true;
    localStorage.setItem('savedQuizzes', JSON.stringify(savedQuizzes));
  }

  // Check if quiz ID is in URL
  const urlParams = new URLSearchParams(window.location.search);
  const quizID = urlParams.get('id');

  if (quizID) {
    saveQuiz(quizID);
    const nameContainer = document.getElementById('name-container');
    const friendNameContainer = document.getElementById('friend-name-container');

    nameContainer.style.display = 'none';
    friendNameContainer.style.display = 'flex';

    window.friendQuizID = quizID;

    database.ref('quizzes/' + quizID).once('value').then(snapshot => {
      const quizData = snapshot.val();
      if (quizData) {
        const startFriendQuizBtn = document.getElementById('start-friend-quiz');
        const friendNameInput = document.getElementById('friend-name');

        startFriendQuizBtn.addEventListener('click', () => {
          const friendName = friendNameInput.value.trim();
          if (!friendName) {
            alert("Please enter your name to start the quiz.");
            return;
          }

          document.getElementById('friend-name-container').style.display = 'none';
          document.getElementById('quiz-container').style.display = 'block';

          currentQuestionIndex = 0;
          userAnswers = [];

          quizQuestions = quizData.answers.map(q => ({
            question: q.question,
            options: [
              { text: q.answer },
              { text: "Random A" },
              { text: "Random B" },
              { text: "Random C" }
            ].sort(() => Math.random() - 0.5)
          }));

          window.correctAnswers = quizData.answers.map(q => q.answer);
          window.friendName = friendName;

          renderQuestion();
          nextBtn.style.display = 'block';
          submitBtn.style.display = 'none';
        });

        document.getElementById('user-name').value = quizData.name + "'s Quiz";
      } else {
        alert("Quiz not found!");
      }
    }).catch(error => {
      console.error("Error loading quiz: ", error);
    });
  }

  const shapesContainer = document.getElementById('bg-shapes');

  // Check if the container exists
  if (shapesContainer) {
    const colors = ['#00f2fe', '#ff2b74', '#ffea00'];
    const shapeTypes = ['circle', 'square', 'triangle'];

    const placedPositions = [];
    const minDistance = 10; // Minimum distance between shapes

    function isFarEnough(x, y) {
      return placedPositions.every(pos => {
        const dx = pos.x - x;
        const dy = pos.y - y;
        return Math.sqrt(dx * dx + dy * dy) > minDistance;
      });
    }

    for (let i = 0; i < 30; i++) {
      let attempts = 0;
      let x, y;
      do {
        x = Math.random() * 100;
        y = Math.random() * 100;
        attempts++;
        if (attempts > 100) break;
      } while (!isFarEnough(x, y));

      placedPositions.push({ x, y });

      const shape = document.createElement('div');
      const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      shape.classList.add('shape', type);
      shape.style.top = `${y}%`;
      shape.style.left = `${x}%`;
      shape.style.opacity = `${Math.random() * 0.4 + 0.2}`;
      shape.style.backgroundColor = color;

      shapesContainer.appendChild(shape);
    }
  }
});

function sharePage() {
  if (navigator.share) {
    navigator.share({
      title: 'Movie Streak',
      text: 'Check out this movie quiz!',
      url: window.location.href
    })
    .then(() => console.log('Thanks for sharing!'))
    .catch((error) => console.error('Error sharing:', error));
  } else {
    alert('Sharing not supported on this browser.');
  }
}
