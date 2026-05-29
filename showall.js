const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAKUsanaSXQIY0RDqXHFEOeOCJqPdebrrnRiCJ5OWfohot_oMAEesIzcRbKA2hI5S-yA/exec";

const showallForm = document.querySelector("#showall-form");
const message = document.querySelector("#showall-message");
const list = document.querySelector("#submission-list");
const summary = document.querySelector("#summary-row");
const tabs = document.querySelector("#question-tabs");
const tabButtons = Array.from(document.querySelectorAll("[data-question-filter]"));
const endpointInput = document.querySelector("#gas-endpoint");
const allowedQuestionIds = new Set(["question-1", "question-2", "question-3", "question-4"]);

let allSubmissions = [];
let activeQuestionFilter = "all";

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function normalizeSubmission(submission) {
  return {
    answer: submission.answer || "",
    questionId: submission.questionId || "",
    questionTitle: submission.questionTitle || "",
    submittedAt: submission.submittedAt || submission.createdAt || ""
  };
}

function countByQuestion(submissions) {
  return submissions.reduce((counts, submission) => {
    counts.all += 1;

    if (submission.questionId) {
      counts[submission.questionId] = (counts[submission.questionId] || 0) + 1;
    }

    return counts;
  }, { all: 0 });
}

function updateTabs(submissions) {
  const counts = countByQuestion(submissions);

  for (const button of tabButtons) {
    const filter = button.dataset.questionFilter;
    const count = counts[filter] || 0;
    const countLabel = button.querySelector("span");

    button.classList.toggle("is-active", filter === activeQuestionFilter);
    button.setAttribute("aria-selected", String(filter === activeQuestionFilter));

    if (countLabel) {
      countLabel.textContent = count;
    }
  }

  tabs.hidden = false;
}

function renderSubmissions() {
  list.textContent = "";
  updateTabs(allSubmissions);

  const submissions = activeQuestionFilter === "all"
    ? allSubmissions
    : allSubmissions.filter((submission) => submission.questionId === activeQuestionFilter);

  if (!submissions.length) {
    summary.hidden = false;
    summary.textContent = activeQuestionFilter === "all"
      ? "回答はまだありません。"
      : "この質問の回答はまだありません。";
    return;
  }

  summary.hidden = false;
  summary.textContent = `${submissions.length}件の回答を表示しています。`;

  const fragment = document.createDocumentFragment();

  for (const item of submissions) {
    const card = document.createElement("article");
    card.className = "submission-card";

    const header = document.createElement("header");

    const date = document.createElement("span");
    date.className = "submission-date";
    date.textContent = formatDate(item.submittedAt) || "日時なし";

    const questionId = document.createElement("span");
    questionId.className = "submission-question-id";
    questionId.textContent = item.questionId || "questionIdなし";

    const question = document.createElement("p");
    question.className = "submission-question";
    question.textContent = item.questionTitle || "質問文なし";

    const answer = document.createElement("p");
    answer.className = "submission-answer";
    answer.textContent = item.answer || "回答なし";

    header.append(date, questionId);
    card.append(header, question, answer);
    fragment.append(card);
  }

  list.append(fragment);
}

function loadJsonp(endpoint) {
  return new Promise((resolve, reject) => {
    const callbackName = `handleSubmissions_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(endpoint);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("GAS request timed out"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    url.searchParams.set("callback", callbackName);
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("GAS request failed"));
    };

    document.body.append(script);
  });
}

async function loadSubmissions(endpoint) {
  const button = showallForm.querySelector("button");

  if (!endpoint) {
    message.textContent = "Apps ScriptのウェブアプリURLを入力してください。";
    return;
  }

  button.disabled = true;
  button.textContent = "読み込み中...";
  message.textContent = "";
  summary.hidden = true;
  tabs.hidden = true;
  list.textContent = "";

  try {
    const data = await loadJsonp(endpoint);
    allSubmissions = (Array.isArray(data.submissions) ? data.submissions : [])
      .map(normalizeSubmission)
      .filter((submission) => allowedQuestionIds.has(submission.questionId))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    activeQuestionFilter = "all";
    renderSubmissions();
  } catch (error) {
    message.textContent = "回答一覧を読み込めませんでした。Apps ScriptのURLと公開設定を確認してください。";
  } finally {
    button.disabled = false;
    button.textContent = "一覧を読み込む";
  }
}

tabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-filter]");

  if (!button) {
    return;
  }

  activeQuestionFilter = button.dataset.questionFilter;
  renderSubmissions();
});

showallForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadSubmissions(endpointInput.value.trim());
});

if (GOOGLE_APPS_SCRIPT_URL) {
  endpointInput.value = GOOGLE_APPS_SCRIPT_URL;
  loadSubmissions(GOOGLE_APPS_SCRIPT_URL);
}
