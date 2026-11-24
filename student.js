"use strict";

const STUDENT_STORAGE_KEYS = {
  tests: "assessly-tests",
  results: "assessly-results",
};

const ACTIVE_ATTEMPT_PREFIX = "assessly-active-";

function readStudentCollection(key) {
  const saved = localStorage.getItem(key);
  if (saved === null) return [];

  const collection = JSON.parse(saved);
  if (!Array.isArray(collection)) {
    throw new Error(`Saved ${key} data is not in the expected format.`);
  }
  return collection;
}

function formatStudentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStudentTestStatus(test, now, result, hasAttempt) {
  if (result) return "Completed";

  const startsAt = new Date(test.dateTime).getTime();
  const duration = Number(test.duration);
  if (!Number.isFinite(startsAt) || !Number.isFinite(duration) || duration <= 0) {
    return "Unavailable";
  }

  const endsAt = startsAt + duration * 60_000;
  if (now < startsAt) return "Upcoming";
  if (now >= endsAt) return "Expired";
  return hasAttempt ? "In progress" : "Available";
}

function addStudentCell(row, text, isHeading) {
  const cell = document.createElement(isHeading ? "th" : "td");
  if (isHeading) cell.scope = "row";
  cell.textContent = text;
  row.append(cell);
  return cell;
}

function createStudentStatus(status) {
  const badge = document.createElement("span");
  badge.className = `student-status student-status-${status.toLowerCase().replace(/ /g, "-")}`;
  badge.textContent = status;
  return badge;
}

function setStudentMessage(text) {
  const message = document.getElementById("student-message");
  message.textContent = text;
  message.hidden = !text;
}

function renderStudentDashboard() {
  try {
    const tests = readStudentCollection(STUDENT_STORAGE_KEYS.tests);
    const results = readStudentCollection(STUDENT_STORAGE_KEYS.results);
    const latestResultByTest = new Map();
    results.forEach((result) => {
      if (!result.testId) return;
      const current = latestResultByTest.get(result.testId);
      if (!current || new Date(result.finishedAt) > new Date(current.finishedAt)) {
        latestResultByTest.set(result.testId, result);
      }
    });

    const testsList = document.getElementById("tests-list");
    const resultsList = document.getElementById("results-list");
    testsList.replaceChildren();
    resultsList.replaceChildren();

    let availableCount = 0;
    let upcomingCount = 0;
    const now = Date.now();

    [...tests]
      .sort((first, second) => new Date(first.dateTime) - new Date(second.dateTime))
      .forEach((test) => {
        const result = latestResultByTest.get(test.id);
        const hasAttempt = Boolean(localStorage.getItem(`${ACTIVE_ATTEMPT_PREFIX}${test.id}`));
        const status = getStudentTestStatus(test, now, result, hasAttempt);
        if (status === "Available" || status === "In progress") availableCount += 1;
        if (status === "Upcoming") upcomingCount += 1;

        const row = document.createElement("tr");
        addStudentCell(row, test.title || "Untitled test", true);
        addStudentCell(row, formatStudentDate(test.dateTime));
        addStudentCell(row, `${Number(test.duration) || 0} min`);
        addStudentCell(row, String(Array.isArray(test.questionIds) ? test.questionIds.length : 0));

        const statusCell = document.createElement("td");
        statusCell.append(createStudentStatus(status));
        row.append(statusCell);

        const actionCell = document.createElement("td");
        if (result) {
          const resultLink = document.createElement("a");
          resultLink.className = "student-action-link";
          resultLink.href = `result.html?resultId=${encodeURIComponent(result.id)}`;
          resultLink.textContent = "View result";
          actionCell.append(resultLink);
        } else if (status === "Available" || status === "In progress") {
          const examLink = document.createElement("a");
          examLink.className = "student-action-link";
          examLink.href = `exam.html?testId=${encodeURIComponent(test.id)}`;
          examLink.textContent = status === "In progress" ? "Resume test" : "Attempt test";
          actionCell.append(examLink);
        } else {
          actionCell.textContent = status === "Upcoming" ? "Not started" : "—";
        }
        row.append(actionCell);
        testsList.append(row);
      });

    [...results]
      .sort((first, second) => new Date(second.finishedAt) - new Date(first.finishedAt))
      .forEach((result) => {
        const score = Number(result.score);
        const total = Number(result.total);
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        const row = document.createElement("tr");
        addStudentCell(row, result.title || "Test", true);
        addStudentCell(row, formatStudentDate(result.finishedAt));
        addStudentCell(row, `${score} / ${total}`);
        addStudentCell(row, `${percentage}%`);
        const resultCell = document.createElement("td");
        const resultLink = document.createElement("a");
        resultLink.className = "student-action-link";
        resultLink.href = `result.html?resultId=${encodeURIComponent(result.id)}`;
        resultLink.textContent = "Review result";
        resultCell.append(resultLink);
        row.append(resultCell);
        resultsList.append(row);
      });

    document.getElementById("available-count").textContent = String(availableCount);
    document.getElementById("upcoming-count").textContent = String(upcomingCount);
    document.getElementById("completed-count").textContent = String(results.length);

    const averageScore =
      results.length === 0
        ? null
        : Math.round(
            results.reduce((sum, result) => {
              const total = Number(result.total);
              return sum + (total > 0 ? (Number(result.score) / total) * 100 : 0);
            }, 0) / results.length,
          );
    document.getElementById("average-score").textContent =
      averageScore === null ? "—" : `${averageScore}%`;

    document.getElementById("tests-table").hidden = tests.length === 0;
    document.getElementById("empty-tests").hidden = tests.length > 0;
    document.getElementById("results-table").hidden = results.length === 0;
    document.getElementById("empty-results").hidden = results.length > 0;
    setStudentMessage("");
  } catch (error) {
    setStudentMessage(`Could not load your tests and results: ${error.message}`);
  }
}

renderStudentDashboard();
