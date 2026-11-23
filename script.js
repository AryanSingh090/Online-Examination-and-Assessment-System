"use strict";

const STORAGE_KEYS = {
  tests: "assessly-tests",
  questions: "assessly-question-bank",
  results: "assessly-results",
};

const ACTIVE_ATTEMPT_PREFIX = "assessly-active-";

function readCollection(key) {
  const saved = localStorage.getItem(key);
  if (saved === null) return [];

  const value = JSON.parse(saved);
  if (!Array.isArray(value)) {
    throw new Error(`Saved ${key} data is not in the expected format.`);
  }
  return value;
}

function writeCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setMessage(element, text, isError) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("message-error", Boolean(isError));
  element.classList.toggle("message-success", Boolean(text) && !isError);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function testStart(test) {
  return new Date(test.dateTime).getTime();
}

function testEnd(test) {
  return testStart(test) + Number(test.duration) * 60_000;
}

function getTestStatus(test, now, result, hasActiveAttempt) {
  if (result) return "Completed";
  const start = testStart(test);
  const end = testEnd(test);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(Number(test.duration))) {
    return "Unavailable";
  }
  if (now < start) return "Upcoming";
  if (now >= end) return "Expired";
  return hasActiveAttempt ? "In progress" : "Available";
}

function getTestQuestions(test, questionBank) {
  if (!Array.isArray(test.questionIds)) return [];
  const questionById = new Map(questionBank.map((question) => [question.id, question]));
  return test.questionIds.map((id) => questionById.get(id)).filter(Boolean);
}

function createPortalEntry(title, details, status, actionHref, actionLabel) {
  const entry = document.createElement("article");
  entry.className = "portal-entry";

  const copy = document.createElement("div");
  copy.className = "portal-entry-copy";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = details;
  const statusLabel = document.createElement("span");
  statusLabel.className = `status-pill status-${status.toLowerCase().replace(/ /g, "-")}`;
  statusLabel.textContent = status;
  copy.append(heading, description);
  entry.append(copy, statusLabel);

  if (actionHref) {
    const action = document.createElement("a");
    action.className = "btn btn-primary portal-entry-action";
    action.href = actionHref;
    action.textContent = actionLabel;
    entry.append(action);
  }
  return entry;
}

function renderExamPicker() {
  const message = document.getElementById("exam-picker-message");
  const examList = document.getElementById("available-exams");
  const resultList = document.getElementById("portal-results");
  try {
    const tests = readCollection(STORAGE_KEYS.tests);
    const questions = readCollection(STORAGE_KEYS.questions);
    const results = readCollection(STORAGE_KEYS.results);
    const resultsByTest = new Map(results.map((result) => [result.testId, result]));
    const now = Date.now();
    examList.replaceChildren();
    resultList.replaceChildren();

    [...tests]
      .sort((first, second) => testStart(first) - testStart(second))
      .forEach((test) => {
        const result = resultsByTest.get(test.id);
        const activeAttempt = localStorage.getItem(`${ACTIVE_ATTEMPT_PREFIX}${test.id}`);
        const matchingQuestions = getTestQuestions(test, questions);
        let status = getTestStatus(test, now, result, Boolean(activeAttempt));
        if (matchingQuestions.length !== (test.questionIds || []).length && status !== "Completed") {
          status = "Unavailable";
        }

        const canStart = status === "Available" || status === "In progress";
        const entry = createPortalEntry(
          test.title || "Untitled exam",
          `${formatDateTime(test.dateTime)} · ${Number(test.duration) || 0} minutes · ${matchingQuestions.length} questions`,
          status,
          canStart ? `exam.html?testId=${encodeURIComponent(test.id)}` : null,
          status === "In progress" ? "Resume exam" : "Start exam",
        );
        examList.append(entry);
      });

    [...results]
      .sort((first, second) => new Date(second.finishedAt) - new Date(first.finishedAt))
      .forEach((result) => {
        resultList.append(
          createPortalEntry(
            result.title || "Exam result",
            `Completed ${formatDateTime(result.finishedAt)} · Score ${result.score} / ${result.total}`,
            "Completed",
            `result.html?resultId=${encodeURIComponent(result.id)}`,
            "View result",
          ),
        );
      });

    document.getElementById("empty-available-exams").hidden = tests.length > 0;
    document.getElementById("empty-portal-results").hidden = results.length > 0;
    setMessage(message, "", false);
  } catch (error) {
    setMessage(message, `Could not load exams and results: ${error.message}`, true);
  }
}

function renderExamMessage(text, isError) {
  const message = document.getElementById("exam-message");
  setMessage(message, text, isError);
  document.getElementById("exam-questions").replaceChildren();
  document.getElementById("question-navigation").replaceChildren();
  document.getElementById("finish-exam").disabled = true;
  document.getElementById("exam-timer").textContent = "--:--:--";
}

function initializeExam() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get("testId");
  if (!testId) {
    document.getElementById("exam-picker").hidden = false;
    document.getElementById("active-exam").hidden = true;
    renderExamPicker();
    return;
  }
  document.getElementById("exam-picker").hidden = true;
  document.getElementById("active-exam").hidden = false;

  let test;
  let questions;
  let results;
  let attempt;
  const attemptKey = `${ACTIVE_ATTEMPT_PREFIX}${testId}`;
  try {
    const tests = readCollection(STORAGE_KEYS.tests);
    const questionBank = readCollection(STORAGE_KEYS.questions);
    results = readCollection(STORAGE_KEYS.results);
    test = tests.find((item) => item.id === testId);
    if (!test) {
      renderExamMessage("This exam could not be found. Return to the exam portal to view scheduled exams.", true);
      return;
    }

    const completedResult = results.find((result) => result.testId === testId);
    if (completedResult) {
      window.location.replace(`result.html?resultId=${encodeURIComponent(completedResult.id)}`);
      return;
    }

    questions = getTestQuestions(test, questionBank);
    if (questions.length === 0 || questions.length !== (test.questionIds || []).length) {
      renderExamMessage("The questions for this exam are unavailable. Please contact your teacher.", true);
      return;
    }

    const now = Date.now();
    const start = testStart(test);
    const scheduledEnd = testEnd(test);
    if (!Number.isFinite(start) || !Number.isFinite(scheduledEnd) || Number(test.duration) <= 0) {
      renderExamMessage("This exam has invalid schedule information. Please contact your teacher.", true);
      return;
    }
    if (now < start) {
      renderExamMessage(`This exam starts on ${formatDateTime(test.dateTime)}.`, true);
      return;
    }
    if (now >= scheduledEnd) {
      renderExamMessage("The scheduled time for this exam has ended.", true);
      return;
    }

    const savedAttempt = localStorage.getItem(attemptKey);
    attempt = savedAttempt
      ? JSON.parse(savedAttempt)
      : {
          endAt: Math.min(now + Number(test.duration) * 60_000, scheduledEnd),
          selectedAnswers: {},
          markedForReview: [],
        };
    if (!Number.isFinite(Number(attempt.endAt)) || Number(attempt.endAt) <= now) {
      attempt.endAt = now;
    }
    if (!attempt.selectedAnswers || typeof attempt.selectedAnswers !== "object") {
      attempt.selectedAnswers = {};
    }
    if (!Array.isArray(attempt.markedForReview)) attempt.markedForReview = [];
    localStorage.setItem(attemptKey, JSON.stringify(attempt));
  } catch (error) {
    renderExamMessage(`Could not load this exam: ${error.message}`, true);
    return;
  }

  document.getElementById("exam-title").textContent = test.title || "Online Exam";
  document.getElementById("exam-schedule").textContent =
    `${formatDateTime(test.dateTime)} · ${Number(test.duration)} minutes`;

  const questionContainer = document.getElementById("exam-questions");
  const questionNavigation = document.getElementById("question-navigation");
  const attemptedCount = document.getElementById("attempted-count");
  const finishButton = document.getElementById("finish-exam");
  const timer = document.getElementById("exam-timer");
  let submitted = false;
  let timerInterval;

  function saveAttempt() {
    localStorage.setItem(attemptKey, JSON.stringify(attempt));
  }

  function updateQuestionStatus() {
    const answeredCount = questions.filter((question) =>
      Number.isInteger(Number(attempt.selectedAnswers[question.id])),
    ).length;
    attemptedCount.textContent = `${answeredCount} of ${questions.length} attempted`;

    questions.forEach((question, index) => {
      const navigationButton = questionNavigation.children[index];
      const isAnswered = Number.isInteger(Number(attempt.selectedAnswers[question.id]));
      const needsReview = attempt.markedForReview.includes(question.id);
      navigationButton.classList.toggle("is-attempted", isAnswered);
      navigationButton.classList.toggle("is-review", needsReview);
      navigationButton.setAttribute(
        "aria-label",
        `Question ${index + 1}${isAnswered ? ", attempted" : ", not attempted"}${needsReview ? ", marked for review" : ""}`,
      );
    });
  }

  questions.forEach((question, questionIndex) => {
    const questionCard = document.createElement("section");
    questionCard.className = "question";
    questionCard.id = `question-${questionIndex + 1}`;

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
      input.checked = Number(attempt.selectedAnswers[question.id]) === optionIndex;
      input.addEventListener("change", () => {
        attempt.selectedAnswers[question.id] = optionIndex;
        saveAttempt();
        updateQuestionStatus();
      });
      label.append(input, document.createTextNode(option));
      options.append(label);
    });

    const reviewButton = document.createElement("button");
    reviewButton.className = "btn btn-secondary review-button";
    reviewButton.type = "button";
    const marked = attempt.markedForReview.includes(question.id);
    reviewButton.textContent = marked ? "Remove review mark" : "Mark for review";
    reviewButton.setAttribute("aria-pressed", String(marked));
    reviewButton.addEventListener("click", () => {
      if (attempt.markedForReview.includes(question.id)) {
        attempt.markedForReview = attempt.markedForReview.filter((id) => id !== question.id);
      } else {
        attempt.markedForReview.push(question.id);
      }
      const isMarked = attempt.markedForReview.includes(question.id);
      reviewButton.textContent = isMarked ? "Remove review mark" : "Mark for review";
      reviewButton.setAttribute("aria-pressed", String(isMarked));
      saveAttempt();
      updateQuestionStatus();
    });

    questionCard.append(options, reviewButton);
    questionContainer.append(questionCard);

    const navigationButton = document.createElement("a");
    navigationButton.className = "question-nav-item";
    navigationButton.href = `#${questionCard.id}`;
    navigationButton.textContent = String(questionIndex + 1);
    navigationButton.setAttribute("aria-label", `Go to question ${questionIndex + 1}`);
    questionNavigation.append(navigationButton);
  });

  function submitExam() {
    if (submitted) return;
    submitted = true;
    window.clearInterval(timerInterval);
    finishButton.disabled = true;

    const answers = questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options,
      correctAnswer: Number(question.correctAnswer),
      selectedAnswer: Number.isInteger(Number(attempt.selectedAnswers[question.id]))
        ? Number(attempt.selectedAnswers[question.id])
        : null,
      markedForReview: attempt.markedForReview.includes(question.id),
    }));
    const score = answers.reduce(
      (total, answer) => total + (answer.selectedAnswer === answer.correctAnswer ? 1 : 0),
      0,
    );
    const result = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      testId: test.id,
      title: test.title || "Online Exam",
      score,
      total: answers.length,
      finishedAt: new Date().toISOString(),
      answers,
    };

    try {
      const savedResults = readCollection(STORAGE_KEYS.results);
      savedResults.push(result);
      writeCollection(STORAGE_KEYS.results, savedResults);
      localStorage.removeItem(attemptKey);
      window.location.href = `result.html?resultId=${encodeURIComponent(result.id)}`;
    } catch (error) {
      submitted = false;
      finishButton.disabled = false;
      setMessage(document.getElementById("exam-message"), `Could not save your result: ${error.message}`, true);
    }
  }

  function updateTimer() {
    const remaining = Math.max(0, Number(attempt.endAt) - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    timer.textContent = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
    timer.closest(".exam-timer").classList.toggle("timer-warning", remaining <= 60_000);
    if (remaining <= 0) submitExam();
  }

  finishButton.disabled = false;
  finishButton.addEventListener("click", submitExam);
  updateQuestionStatus();
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function renderResult() {
  const summary = document.getElementById("result-summary");
  const answerReview = document.getElementById("answer-review");
  const message = document.getElementById("result-message");
  const resultId = new URLSearchParams(window.location.search).get("resultId");

  try {
    const results = readCollection(STORAGE_KEYS.results);
    const result = results.find((item) => item.id === resultId);
    if (!result) {
      setMessage(message, "No saved exam result was found. Return to the exam portal to view scheduled exams.", true);
      return;
    }

    const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    const resultBox = document.createElement("div");
    resultBox.className = "result-box";
    const details = document.createElement("div");
    const examTitle = document.createElement("h2");
    examTitle.textContent = result.title || "Exam";
    const score = document.createElement("p");
    score.textContent = `Your score: ${result.score} / ${result.total} (${percentage}%)`;
    const completed = document.createElement("p");
    completed.textContent = `Completed ${formatDateTime(result.finishedAt)}`;
    details.append(examTitle, score, completed);
    const status = document.createElement("strong");
    status.className = percentage >= 50 ? "status-pass" : "status-fail";
    status.textContent = percentage >= 50 ? "Passed" : "Keep practicing";
    resultBox.append(details, status);
    summary.replaceChildren(resultBox);

    (result.answers || []).forEach((answer, index) => {
      const card = document.createElement("article");
      card.className = "question result-question";
      const heading = document.createElement("h2");
      heading.textContent = `${index + 1}. ${answer.text}`;
      const yourAnswer = document.createElement("p");
      yourAnswer.textContent =
        answer.selectedAnswer === null || answer.selectedAnswer === undefined
          ? "Your answer: Not answered"
          : `Your answer: ${answer.options[answer.selectedAnswer]}`;
      const correctAnswer = document.createElement("p");
      correctAnswer.textContent = `Correct answer: ${answer.options[answer.correctAnswer]}`;
      card.append(heading, yourAnswer, correctAnswer);
      if (answer.markedForReview) {
        const review = document.createElement("span");
        review.className = "review-label";
        review.textContent = "Marked for review";
        card.append(review);
      }
      answerReview.append(card);
    });
  } catch (error) {
    setMessage(message, `Could not load the exam result: ${error.message}`, true);
  }
}

if (document.body.dataset.page === "exam") initializeExam();
if (document.body.dataset.page === "result") renderResult();
