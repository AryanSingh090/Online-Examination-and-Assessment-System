const questions = [
  {
    id: "q1",
    text: "Which HTML tag is used to define a table?",
    options: ["<table>", "<div>", "<section>", "<form>"],
    answer: 0,
  },
  {
    id: "q2",
    text: "Which CSS property controls text size?",
    options: ["font-size", "text-align", "padding", "border"],
    answer: 0,
  },
  {
    id: "q3",
    text: "What is JavaScript mainly used for?",
    options: ["Styling", "Structure", "Interaction and logic", "Database setup"],
    answer: 2,
  },
  {
    id: "q4",
    text: "Which CSS property creates spacing inside an element?",
    options: ["margin", "padding", "border-radius", "display"],
    answer: 1,
  },
];

const storageKey = "web-development-quiz-result";
const questionContainer = document.querySelector("#exam-questions");
const questionNavigation = document.querySelector("#question-navigation");
const attemptedCount = document.querySelector("#attempted-count");
const answers = new Map();
const reviewQuestions = new Set();

function renderExam() {
  questions.forEach((question, questionIndex) => {
    const questionCard = document.createElement("section");
    questionCard.className = "question";
    questionCard.id = question.id;

    const heading = document.createElement("h2");
    heading.textContent = `${questionIndex + 1}. ${question.text}`;
    questionCard.append(heading);

    const options = document.createElement("div");
    options.className = "options";

    question.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = question.id;
      input.value = String(optionIndex);
      input.addEventListener("change", () => {
        answers.set(question.id, optionIndex);
        updateQuestionStatus();
      });

      label.append(input, document.createTextNode(option));
      options.append(label);
    });

    const reviewButton = document.createElement("button");
    reviewButton.className = "btn btn-secondary review-button";
    reviewButton.type = "button";
    reviewButton.textContent = "Mark for Review";
    reviewButton.setAttribute("aria-pressed", "false");
    reviewButton.addEventListener("click", () => {
      if (reviewQuestions.has(question.id)) {
        reviewQuestions.delete(question.id);
        reviewButton.textContent = "Mark for Review";
        reviewButton.setAttribute("aria-pressed", "false");
      } else {
        reviewQuestions.add(question.id);
        reviewButton.textContent = "Remove Review Mark";
        reviewButton.setAttribute("aria-pressed", "true");
      }
      updateQuestionStatus();
    });

    questionCard.append(options, reviewButton);
    questionContainer.append(questionCard);

    const navigationButton = document.createElement("a");
    navigationButton.className = "question-nav-item";
    navigationButton.href = `#${question.id}`;
    navigationButton.textContent = String(questionIndex + 1);
    navigationButton.setAttribute("aria-label", `Go to question ${questionIndex + 1}`);
    questionNavigation.append(navigationButton);
  });
}

function updateQuestionStatus() {
  attemptedCount.textContent = `${answers.size} of ${questions.length} attempted`;

  questions.forEach((question, index) => {
    const navigationButton = questionNavigation.children[index];
    navigationButton.classList.toggle("is-attempted", answers.has(question.id));
    navigationButton.classList.toggle("is-review", reviewQuestions.has(question.id));
    navigationButton.setAttribute(
      "aria-label",
      `Question ${index + 1}${answers.has(question.id) ? ", attempted" : ", not attempted"}${
        reviewQuestions.has(question.id) ? ", marked for review" : ""
      }`
    );
  });
}

document.querySelector("#finish-exam").addEventListener("click", () => {
  const score = questions.reduce(
    (total, question) => total + (answers.get(question.id) === question.answer ? 1 : 0),
    0
  );
  const result = {
    score,
    total: questions.length,
    answers: questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options,
      correctAnswer: question.answer,
      selectedAnswer: answers.has(question.id) ? answers.get(question.id) : null,
      markedForReview: reviewQuestions.has(question.id),
    })),
  };

  sessionStorage.setItem(storageKey, JSON.stringify(result));
  window.location.href = "result.html";
});

renderExam();
updateQuestionStatus();
