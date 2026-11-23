"use strict";

const STORAGE_KEYS = {
  questions: "assessly-question-bank",
  tests: "assessly-tests",
};

const starterQuestions = [
  {
    id: "starter-1",
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    correctAnswer: 1,
  },
  {
    id: "starter-2",
    text: "What is the chemical symbol for water?",
    options: ["CO2", "O2", "H2O", "NaCl"],
    correctAnswer: 2,
  },
  {
    id: "starter-3",
    text: "What is 12 × 8?",
    options: ["88", "96", "108", "86"],
    correctAnswer: 1,
  },
  {
    id: "starter-4",
    text: "Which gas do plants absorb from the atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    correctAnswer: 2,
  },
];

function readCollection(key, initialValue) {
  const savedValue = localStorage.getItem(key);
  if (savedValue === null) {
    localStorage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  }

  const collection = JSON.parse(savedValue);
  if (!Array.isArray(collection)) {
    throw new Error("Saved assessment data is not in the expected format.");
  }
  return collection;
}

function writeCollection(key, collection) {
  localStorage.setItem(key, JSON.stringify(collection));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setMessage(element, message, isError) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("message-error", Boolean(isError));
  element.classList.toggle("message-success", Boolean(message) && !isError);
}

function formatTestDate(dateTime) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function renderDashboard() {
  const message = document.getElementById("dashboard-message");
  try {
    const tests = readCollection(STORAGE_KEYS.tests, []);
    const questions = readCollection(STORAGE_KEYS.questions, starterQuestions);
    const now = Date.now();
    const upcomingTests = tests.filter((test) => new Date(test.dateTime).getTime() >= now);

    document.getElementById("test-count").textContent = String(tests.length);
    document.getElementById("upcoming-count").textContent = String(upcomingTests.length);
    document.getElementById("question-count").textContent = String(questions.length);

    const records = document.getElementById("test-records");
    records.replaceChildren();
    [...tests]
      .sort((first, second) => new Date(second.dateTime) - new Date(first.dateTime))
      .forEach((test) => {
        const row = document.createElement("tr");
        const titleCell = document.createElement("th");
        titleCell.scope = "row";
        titleCell.textContent = test.title;

        const dateCell = document.createElement("td");
        dateCell.textContent = formatTestDate(test.dateTime);
        const durationCell = document.createElement("td");
        durationCell.textContent = `${test.duration} min`;
        const questionsCell = document.createElement("td");
        questionsCell.textContent = String(test.questionIds.length);
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        const isUpcoming = new Date(test.dateTime).getTime() >= now;
        status.className = `status-pill ${isUpcoming ? "status-upcoming" : "status-completed"}`;
        status.textContent = isUpcoming ? "Upcoming" : "Completed";
        statusCell.append(status);
        row.append(titleCell, dateCell, durationCell, questionsCell, statusCell);
        records.append(row);
      });

    document.getElementById("empty-records").hidden = tests.length > 0;
    document.querySelector(".records-table").hidden = tests.length === 0;
    setMessage(message, "", false);
  } catch (error) {
    setMessage(message, `Could not load saved dashboard data: ${error.message}`, true);
  }
}

function renderQuestionBank(selectedIds) {
  const questions = readCollection(STORAGE_KEYS.questions, starterQuestions);
  const list = document.getElementById("question-list");
  list.replaceChildren();

  questions.forEach((question) => {
    const card = document.createElement("article");
    card.className = "bank-question";
    const label = document.createElement("label");
    label.className = "question-select";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "questionIds";
    checkbox.value = question.id;
    checkbox.checked = selectedIds.has(question.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedIds.add(question.id);
      else selectedIds.delete(question.id);
      document.getElementById("selected-count").textContent = `${selectedIds.size} selected`;
    });

    const text = document.createElement("span");
    text.className = "bank-question-text";
    text.textContent = question.text;
    label.append(checkbox, text);

    const options = document.createElement("ol");
    options.className = "bank-options";
    options.type = "A";
    question.options.forEach((option, index) => {
      const item = document.createElement("li");
      item.textContent = option;
      if (index === Number(question.correctAnswer)) {
        item.classList.add("correct-option");
        item.append(" · Correct answer");
      }
      options.append(item);
    });
    card.append(label, options);
    list.append(card);
  });

  document.getElementById("empty-bank").hidden = questions.length > 0;
  document.getElementById("selected-count").textContent = `${selectedIds.size} selected`;
}

function setMinimumTestDate() {
  const dateInput = document.getElementById("test-date");
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  dateInput.min = localToday;
}

function initializeTestBuilder() {
  const message = document.getElementById("builder-message");
  const selectedIds = new Set();
  const testForm = document.getElementById("test-form");
  const questionForm = document.getElementById("question-form");

  try {
    renderQuestionBank(selectedIds);
    setMinimumTestDate();
  } catch (error) {
    setMessage(message, `Could not load the question bank: ${error.message}`, true);
    testForm.querySelector('button[type="submit"]').disabled = true;
    questionForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  questionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!questionForm.reportValidity()) return;

    const formData = new FormData(questionForm);
    const question = {
      id: createId(),
      text: String(formData.get("question")).trim(),
      options: ["optionA", "optionB", "optionC", "optionD"].map((name) =>
        String(formData.get(name)).trim(),
      ),
      correctAnswer: Number(formData.get("correctAnswer")),
    };

    try {
      const questions = readCollection(STORAGE_KEYS.questions, starterQuestions);
      questions.push(question);
      writeCollection(STORAGE_KEYS.questions, questions);
      selectedIds.add(question.id);
      renderQuestionBank(selectedIds);
      questionForm.reset();
      setMessage(message, "Question added to your bank and selected for this test.", false);
    } catch (error) {
      setMessage(message, `Could not save the question: ${error.message}`, true);
    }
  });

  testForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!testForm.reportValidity()) return;
    if (selectedIds.size === 0) {
      setMessage(message, "Choose at least one question before scheduling the test.", true);
      document.getElementById("bank-title").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const formData = new FormData(testForm);
    const dateTime = `${formData.get("date")}T${formData.get("time")}`;
    if (new Date(dateTime).getTime() <= Date.now()) {
      setMessage(message, "Choose a future date and time for the test.", true);
      return;
    }

    const test = {
      id: createId(),
      title: String(formData.get("title")).trim(),
      dateTime,
      duration: Number(formData.get("duration")),
      questionIds: [...selectedIds],
    };

    try {
      const tests = readCollection(STORAGE_KEYS.tests, []);
      tests.push(test);
      writeCollection(STORAGE_KEYS.tests, tests);
      window.location.href = "teacher-dashboard.html";
    } catch (error) {
      setMessage(message, `Could not save the test: ${error.message}`, true);
    }
  });
}

if (document.body.dataset.page === "dashboard") renderDashboard();
if (document.body.dataset.page === "create-test") initializeTestBuilder();
