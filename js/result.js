const storageKey = "web-development-quiz-result";
const summary = document.querySelector("#result-summary");
const answerReview = document.querySelector("#answer-review");
const savedResult = sessionStorage.getItem(storageKey);

if (!savedResult) {
  const message = document.createElement("p");
  message.textContent = "No exam result is available yet. Take the exam to see your score.";
  summary.append(message);
} else {
  const result = JSON.parse(savedResult);
  const scorePercentage = Math.round((result.score / result.total) * 100);
  const resultBox = document.createElement("div");
  resultBox.className = "result-box";

  const scoreDetails = document.createElement("div");
  const scoreHeading = document.createElement("h2");
  scoreHeading.textContent = `Your score: ${result.score} / ${result.total}`;
  const percentage = document.createElement("p");
  percentage.textContent = `${scorePercentage}% correct`;
  scoreDetails.append(scoreHeading, percentage);

  const status = document.createElement("strong");
  status.className = scorePercentage >= 50 ? "status-pass" : "status-fail";
  status.textContent = scorePercentage >= 50 ? "Passed" : "Keep practicing";
  resultBox.append(scoreDetails, status);
  summary.append(resultBox);

  result.answers.forEach((answer, index) => {
    const answerCard = document.createElement("article");
    answerCard.className = "question result-question";

    const questionHeading = document.createElement("h2");
    questionHeading.textContent = `${index + 1}. ${answer.text}`;
    const yourAnswer = document.createElement("p");
    yourAnswer.textContent =
      answer.selectedAnswer === null
        ? "Your answer: Not answered"
        : `Your answer: ${answer.options[answer.selectedAnswer]}`;
    const correctAnswer = document.createElement("p");
    correctAnswer.textContent = `Correct answer: ${answer.options[answer.correctAnswer]}`;

    answerCard.append(questionHeading, yourAnswer, correctAnswer);
    if (answer.markedForReview) {
      const reviewLabel = document.createElement("span");
      reviewLabel.className = "review-label";
      reviewLabel.textContent = "Marked for review";
      answerCard.append(reviewLabel);
    }
    answerReview.append(answerCard);
  });
}
