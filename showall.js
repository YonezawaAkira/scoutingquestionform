const showallForm = document.querySelector("#showall-form");
const message = document.querySelector("#showall-message");
const list = document.querySelector("#submission-list");
const summary = document.querySelector("#summary-row");
const tabs = document.querySelector("#question-tabs");
const tabButtons = Array.from(document.querySelectorAll("[data-question-filter]"));

let allSubmissions = [];
let activeQuestionFilter = "all";

const fieldAliases = {
  answer: ["answer", "message"],
  questionId: ["questionId", "question_id", "question-id"],
  questionTitle: ["questionTitle", "question_title", "question-title"],
  submittedAt: ["submittedAt", "submitted_at", "_date", "created_at"]
};

function pickField(submission, names) {
  for (const name of names) {
    if (submission[name] !== undefined && submission[name] !== null) {
      return submission[name];
    }
  }
  return "";
}

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
    answer: pickField(submission, fieldAliases.answer),
    questionId: pickField(submission, fieldAliases.questionId),
    questionTitle: pickField(submission, fieldAliases.questionTitle),
    submittedAt: pickField(submission, fieldAliases.submittedAt)
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

  const formData = new FormData(showallForm);
  const formId = String(formData.get("formId") || "").trim();
  const apiKey = String(formData.get("apiKey") || "").trim();
  const button = showallForm.querySelector("button");

  if (!formId || !apiKey) {
    message.textContent = "Form IDとAPI keyを入力してください。";
    return;
  }

  button.disabled = true;
  button.textContent = "読み込み中...";
  message.textContent = "";
  summary.hidden = true;
  tabs.hidden = true;
  list.textContent = "";

  try {
    const response = await fetch(`https://formspree.io/api/0/forms/${encodeURIComponent(formId)}/submissions`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Formspree API error: ${response.status}`);
    }

    const data = await response.json();
    allSubmissions = (Array.isArray(data.submissions) ? data.submissions : [])
      .map(normalizeSubmission)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    activeQuestionFilter = "all";
    renderSubmissions();
  } catch (error) {
    message.textContent = "回答一覧を読み込めませんでした。Form ID、API key、Formspreeのプラン/API権限を確認してください。";
  } finally {
    button.disabled = false;
    button.textContent = "一覧を読み込む";
  }
});
