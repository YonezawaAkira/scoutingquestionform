const GOOGLE_SHEET_ID = "1qNSA8UjU9jD_dIrX1cilCw5Aa1PCIlAPfHgspbyB8AE";
const GOOGLE_SHEET_NAME = "responses";

const questionPages = [
  { id: "question-1", label: "Q1", href: "showq1.html" },
  { id: "question-2", label: "Q2", href: "showq2.html" },
  { id: "question-3", label: "Q3", href: "showq3.html" },
  { id: "question-4", label: "Q4", href: "showq4.html" }
];

const message = document.querySelector("#showall-message");
const linkList = document.querySelector("#question-link-list");

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

function getQuestionTitle(submissions, questionId) {
  const match = submissions.find((submission) => submission.questionId === questionId && submission.questionTitle);
  return match?.questionTitle || "まだ回答がありません。";
}

function countAnswers(submissions, questionId) {
  return submissions.filter((submission) => submission.questionId === questionId).length;
}

function renderQuestionLinks(submissions) {
  linkList.textContent = "";

  for (const question of questionPages) {
    const item = document.createElement("a");
    const label = document.createElement("span");
    const title = document.createElement("span");
    const count = document.createElement("span");

    item.className = "question-link-item";
    item.href = question.href;
    label.className = "question-link-label";
    title.className = "question-link-title";
    count.className = "question-link-count";

    label.textContent = question.label;
    title.textContent = getQuestionTitle(submissions, question.id);
    count.textContent = `${countAnswers(submissions, question.id)}件`;

    item.append(label, title, count);
    linkList.append(item);
  }
}

async function init() {
  message.textContent = "読み込み中...";

  try {
    renderQuestionLinks(await loadSubmissions());
    message.textContent = "";
  } catch (error) {
    console.error(error);
    message.textContent = `回答一覧を読み込めませんでした。${error.message}`;
  }
}

init();
