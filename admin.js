const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAKUsanaSXQIY0RDqXHFEOeOCJqPdebrrnRiCJ5OWfohot_oMAEesIzcRbKA2hI5S-yA/exec";
const GOOGLE_SHEET_ID = "1qNSA8UjU9jD_dIrX1cilCw5Aa1PCIlAPfHgspbyB8AE";
const GOOGLE_SHEET_NAME = "responses";
const ADMIN_ID = "zenkokutaikai_mitoha";
const ADMIN_PASSWORD = "iyasaka";

const loginForm = document.querySelector("#admin-login");
const message = document.querySelector("#admin-message");
const adminPanel = document.querySelector("#admin-panel");
const summary = document.querySelector("#admin-summary");
const list = document.querySelector("#admin-list");

let credentials = null;

function formatDate(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return value || "日時なし";
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
  const rows = data.table?.rows || [];
  const values = rows.map((row) => (row.c || []).map((cell) => cell?.v ?? ""));
  const hasHeader = values[0]?.[0] === "submittedAt";
  const bodyRows = hasHeader ? values.slice(1) : values;
  const firstDataRow = hasHeader ? 2 : 1;

  return bodyRows
    .map((row, index) => ({
      rowNumber: firstDataRow + index,
      submittedAt: row[0] || "",
      questionId: row[1] || "",
      questionTitle: row[2] || "",
      answer: row[3] || ""
    }))
    .filter((row) => row.submittedAt || row.questionId || row.questionTitle || row.answer);
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

function renderSubmissions(submissions) {
  list.textContent = "";
  summary.textContent = `${submissions.length}件の回答があります。`;

  if (!submissions.length) {
    const empty = document.createElement("article");
    empty.className = "submission-card";
    empty.textContent = "削除できる回答はありません。";
    list.append(empty);
    return;
  }

  for (const submission of submissions.sort((a, b) => b.rowNumber - a.rowNumber)) {
    const card = document.createElement("article");
    const header = document.createElement("header");
    const date = document.createElement("span");
    const row = document.createElement("span");
    const question = document.createElement("p");
    const answer = document.createElement("p");
    const button = document.createElement("button");

    card.className = "submission-card";
    date.className = "submission-date";
    row.className = "submission-question-id";
    question.className = "submission-question";
    answer.className = "submission-answer";
    button.className = "danger-button";
    button.type = "button";

    date.textContent = formatDate(submission.submittedAt);
    row.textContent = `row ${submission.rowNumber} / ${submission.questionId || "questionIdなし"}`;
    question.textContent = submission.questionTitle || "質問文なし";
    answer.textContent = submission.answer || "回答なし";
    button.textContent = "削除";
    button.addEventListener("click", () => deleteSubmission(submission));

    header.append(date, row);
    card.append(header, question, answer, button);
    list.append(card);
  }
}

async function deleteSubmission(submission) {
  const ok = window.confirm(`この回答を削除しますか？\n\n${submission.answer}`);

  if (!ok || !credentials) {
    return;
  }

  message.textContent = "削除中...";

  await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      action: "deleteRow",
      rowNumber: String(submission.rowNumber),
      adminId: credentials.adminId,
      adminPassword: credentials.adminPassword
    })
  });

  window.setTimeout(async () => {
    await refresh();
    message.textContent = "削除リクエストを送信しました。";
  }, 1200);
}

async function refresh() {
  renderSubmissions(await loadSubmissions());
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const adminId = String(formData.get("adminId") || "");
  const adminPassword = String(formData.get("adminPassword") || "");

  if (adminId !== ADMIN_ID || adminPassword !== ADMIN_PASSWORD) {
    message.textContent = "IDまたはPasswordが違います。";
    return;
  }

  credentials = { adminId, adminPassword };
  message.textContent = "読み込み中...";
  adminPanel.hidden = false;

  try {
    await refresh();
    message.textContent = "";
  } catch (error) {
    console.error(error);
    message.textContent = `読み込みに失敗しました。${error.message}`;
  }
});
