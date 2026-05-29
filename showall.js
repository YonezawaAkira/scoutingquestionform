const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAKUsanaSXQIY0RDqXHFEOeOCJqPdebrrnRiCJ5OWfohot_oMAEesIzcRbKA2hI5S-yA/exec";
const GOOGLE_SHEET_ID = "1qNSA8UjU9jD_dIrX1cilCw5Aa1PCIlAPfHgspbyB8AE";
const GOOGLE_SHEET_NAME = "responses";

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
      reject(new Error(`GAS request failed: ${url.toString()}`));
    };

    document.body.append(script);
  });
}

function parseGoogleSheetResponse(text) {
  const prefix = "google.visualization.Query.setResponse(";
  const start = text.indexOf(prefix);
  const end = text.lastIndexOf(");");

  if (start === -1 || end === -1) {
    throw new Error("Google Sheets response format was not recognized");
  }

  const json = text.slice(start + prefix.length, end);
  const data = JSON.parse(json);

  if (data.status !== "ok") {
    throw new Error(`Google Sheets returned ${data.status || "an error"}`);
  }

  const rows = data.table?.rows || [];
  const values = rows.map((row) => (row.c || []).map((cell) => cell?.v ?? ""));
  const bodyRows = values[0]?.[0] === "submittedAt" ? values.slice(1) : values;

  return {
    ok: true,
    submissions: bodyRows
      .filter((row) => row.some((value) => value !== ""))
      .map((row) => ({
        submittedAt: row[0] || "",
        questionId: row[1] || "",
        questionTitle: row[2] || "",
        answer: row[3] || ""
      }))
  };
}

async function loadFromSheet() {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq`);
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", GOOGLE_SHEET_NAME);
  url.searchParams.set("cacheBust", String(Date.now()));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }

  return parseGoogleSheetResponse(await response.text());
}

function loadIframe(endpoint) {
  return new Promise((resolve, reject) => {
    const requestId = `submissions_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement("iframe");
    const url = new URL(endpoint);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("GAS iframe request timed out"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      iframe.remove();
    }

    function handleMessage(event) {
      const payload = event.data;

      if (
        !payload ||
        payload.type !== "scoutingquestionform:submissions" ||
        payload.requestId !== requestId
      ) {
        return;
      }

      cleanup();
      resolve(payload.data);
    }

    window.addEventListener("message", handleMessage);
    url.searchParams.set("transport", "iframe");
    url.searchParams.set("requestId", requestId);
    iframe.hidden = true;
    iframe.src = url.toString();
    iframe.onerror = () => {
      cleanup();
      reject(new Error("GAS iframe request failed"));
    };

    document.body.append(iframe);
  });
}

async function loadFromGas(endpoint) {
  try {
    return await loadFromSheet();
  } catch (sheetError) {
    console.warn("Google Sheets loading failed. Trying Apps Script JSONP.", sheetError);
  }

  try {
    return await loadJsonp(endpoint);
  } catch (jsonpError) {
    console.warn("JSONP loading failed. Trying iframe fallback.", jsonpError);
    return loadIframe(endpoint);
  }
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
    const data = await loadFromGas(endpoint);
    if (!data || data.ok === false) {
      throw new Error(data?.error || "GAS returned an error response");
    }

    allSubmissions = (Array.isArray(data.submissions) ? data.submissions : [])
      .map(normalizeSubmission)
      .filter((submission) => allowedQuestionIds.has(submission.questionId))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    activeQuestionFilter = "all";
    renderSubmissions();
  } catch (error) {
    console.error(error);
    message.textContent = `回答一覧を読み込めませんでした。${error.message}`;
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
