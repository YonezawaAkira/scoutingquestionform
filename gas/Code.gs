const SPREADSHEET_ID = "1qNSA8UjU9jD_dIrX1cilCw5Aa1PCIlAPfHgspbyB8AE";
const SHEET_NAME = "responses";
const HEADERS = ["submittedAt", "questionId", "questionTitle", "answer"];
const ADMIN_ID = "zenkokutaikai_mitoha";
const ADMIN_PASSWORD = "iyasaka";

function doPost(e) {
  const sheet = getSheet();
  const params = e.parameter || {};

  if (params.action === "deleteRow") {
    return deleteRowResponse(sheet, params);
  }

  const submittedAt = params.submittedAt || new Date().toISOString();
  const questionId = String(params.questionId || "").trim();
  const questionTitle = String(params.questionTitle || "").trim();
  const answer = String(params.answer || "").trim();

  if (!questionId || !answer) {
    return jsonResponse({ ok: false, error: "questionId and answer are required" });
  }

  sheet.appendRow([submittedAt, questionId, questionTitle, answer]);
  return jsonResponse({ ok: true });
}

function deleteRowResponse(sheet, params) {
  if (params.adminId !== ADMIN_ID || params.adminPassword !== ADMIN_PASSWORD) {
    return jsonResponse({ ok: false, error: "Unauthorized" });
  }

  const rowNumber = Number(params.rowNumber);
  const lastRow = sheet.getLastRow();

  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > lastRow) {
    return jsonResponse({ ok: false, error: "Invalid row number" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    sheet.deleteRow(rowNumber);
  } finally {
    lock.releaseLock();
  }

  return jsonResponse({ ok: true });
}

function doGet(e) {
  const callback = e.parameter && e.parameter.callback;
  const transport = e.parameter && e.parameter.transport;
  const requestId = e.parameter && e.parameter.requestId;
  const submissions = readSubmissions();
  const response = { ok: true, submissions };
  const payload = JSON.stringify(response);

  if (transport === "iframe") {
    return iframeResponse(response, requestId || "");
  }

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${payload});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function iframeResponse(payload, requestId) {
  const safePayload = JSON.stringify(payload).replace(/</g, "\\u003c");
  const safeRequestId = JSON.stringify(requestId);
  const html = `
<!doctype html>
<html>
  <body>
    <script>
      window.parent.postMessage({
        type: "scoutingquestionform:submissions",
        requestId: ${safeRequestId},
        data: ${safePayload}
      }, "*");
    </script>
  </body>
</html>`;

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => currentHeaders[index] !== header);

  if (needsHeaders) {
    headerRange.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function readSubmissions() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => ({
      submittedAt: formatDateValue(row[0]),
      questionId: row[1],
      questionTitle: row[2],
      answer: row[3]
    }));
}

function formatDateValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
