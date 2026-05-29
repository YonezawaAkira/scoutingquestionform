const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAKUsanaSXQIY0RDqXHFEOeOCJqPdebrrnRiCJ5OWfohot_oMAEesIzcRbKA2hI5S-yA/exec";

const form = document.querySelector(".question-card");

function removeOtherQuestionsLink(form) {
  form.querySelector(".other-questions-link")?.remove();
}

function showOtherQuestionsLink(message) {
  const link = document.createElement("a");

  link.className = "other-questions-link";
  link.href = "all-question.html";
  link.textContent = "ほかの質問はこちら";
  message.insertAdjacentElement("afterend", link);
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const answer = String(formData.get("answer") || "").trim();
    const message = form.querySelector(".message");
    const button = form.querySelector("button");
    removeOtherQuestionsLink(form);

    if (!answer) {
      message.textContent = "回答を入力してください。";
      return;
    }

    const questionId = form.dataset.questionId;
    const questionTitle = form.querySelector("h1").textContent.trim();
    const submission = {
      questionId,
      questionTitle,
      answer,
      submittedAt: new Date().toISOString()
    };

    if (!GOOGLE_APPS_SCRIPT_URL) {
      message.textContent = "Apps ScriptのウェブアプリURLをscript.jsに設定してください。";
      return;
    }

    button.disabled = true;
    button.textContent = "送信中...";
    message.textContent = "";

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams(submission)
      });

      form.reset();
      message.textContent = "回答を受け付けました。ありがとうございました。";
      showOtherQuestionsLink(message);
    } catch (error) {
      message.textContent = "送信できませんでした。時間をおいてもう一度お試しください。";
    } finally {
      button.disabled = false;
      button.textContent = "回答を送信";
    }
  });
}
