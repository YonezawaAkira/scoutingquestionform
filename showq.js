const GOOGLE_SHEET_ID = "1qNSA8UjU9jD_dIrX1cilCw5Aa1PCIlAPfHgspbyB8AE";
const GOOGLE_SHEET_NAME = "responses";
const PER_PAGE = 10;

const panel = document.querySelector("[data-question-id]");
const message = document.querySelector("#showq-message");
const summary = document.querySelector("#summary-row");
const list = document.querySelector("#submission-list");
const pagination = document.querySelector("#pagination");

const questionId = panel.dataset.questionId;
const questionLabel = panel.dataset.questionLabel;

function getCurrentPage() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("page") || "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function pageUrl(page) {
  const params = new URLSearchParams(window.location.search);

  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
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

function parseGoogleSheetResponse(text) {
  const prefix = "google.visualization.Query.setResponse(";
  const start = text.indexOf(prefix);
  const end = text.lastIndexOf(");");

  if (start === -1 || end === -1) {
    throw new Error("Google Sheets response format was not recognized");
  }

  const data = JSON.parse(text.slice(start + prefix.length, end));

  if (data.status !== "ok") {
    throw new Error(`Google Sheets returned ${data.status || "an error"}`);
  }

  const rows = data.table?.rows || [];
  const values = rows.map((row) => (row.c || []).map((cell) => cell?.v ?? ""));
  const bodyRows = values[0]?.[0] === "submittedAt" ? values.slice(1) : values;

  return bodyRows
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => ({
      submittedAt: row[0] || "",
      questionId: row[1] || "",
      questionTitle: row[2] || "",
      answer: row[3] || ""
    }));
}

async function loadSubmissions() {
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

function appendSubmission(item) {
  const card = document.createElement("article");
  const header = document.createElement("header");
  const date = document.createElement("span");
  const question = document.createElement("p");
  const answer = document.createElement("p");

  card.className = "submission-card";
  date.className = "submission-date";
  question.className = "submission-question";
  answer.className = "submission-answer";

  date.textContent = formatDate(item.submittedAt) || "日時なし";
  question.textContent = item.questionTitle || "質問文なし";
  answer.textContent = item.answer || "回答なし";

  header.append(date);
  card.append(header, question, answer);
  list.append(card);
}

function renderPagination(currentPage, totalPages) {
  pagination.textContent = "";
  pagination.hidden = totalPages <= 1;

  if (totalPages <= 1) {
    return;
  }

  const prev = currentPage > 1
    ? `<a class="pagination-button" href="${pageUrl(currentPage - 1)}" aria-label="前の10件">&larr;</a>`
    : '<span class="pagination-button is-disabled" aria-hidden="true">&larr;</span>';
  const next = currentPage < totalPages
    ? `<a class="pagination-button" href="${pageUrl(currentPage + 1)}" aria-label="次の10件">&rarr;</a>`
    : '<span class="pagination-button is-disabled" aria-hidden="true">&rarr;</span>';

  pagination.innerHTML = `${prev}<span class="pagination-status">${currentPage} / ${totalPages}</span>${next}`;
}

function render(submissions) {
  const filtered = submissions
    .filter((submission) => submission.questionId === questionId)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(getCurrentPage(), totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  summary.hidden = false;
  summary.textContent = `${questionLabel}: ${filtered.length}件中 ${paged.length}件を表示しています。`;
  list.textContent = "";

  if (!paged.length) {
    const empty = document.createElement("article");
    const text = document.createElement("p");

    empty.className = "submission-card";
    text.className = "submission-answer";
    text.textContent = "この質問の回答はまだありません。";
    empty.append(text);
    list.append(empty);
  } else {
    for (const item of paged) {
      appendSubmission(item);
    }
  }

  renderPagination(currentPage, totalPages);
}

async function init() {
  message.textContent = "読み込み中...";

  try {
    render(await loadSubmissions());
    message.textContent = "";
  } catch (error) {
    console.error(error);
    message.textContent = `回答一覧を読み込めませんでした。${error.message}`;
  }
}

init();
