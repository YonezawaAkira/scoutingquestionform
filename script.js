const FORMSPREE_ENDPOINT = "https://formspree.io/f/xzdwyypw";

const form = document.querySelector(".question-card");

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const answer = String(formData.get("answer") || "").trim();
    const message = form.querySelector(".message");
    const button = form.querySelector("button");

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

    if (FORMSPREE_ENDPOINT.includes("your-form-id")) {
      message.textContent = "Formspreeの送信先URLをscript.jsに設定してください。";
      return;
    }

    button.disabled = true;
    button.textContent = "送信中...";
    message.textContent = "";

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submission)
      });

      if (!response.ok) {
        throw new Error("送信に失敗しました。");
      }

      form.reset();
      message.textContent = "回答を受け付けました。ありがとうございました。";
    } catch (error) {
      message.textContent = "送信できませんでした。時間をおいてもう一度お試しください。";
    } finally {
      button.disabled = false;
      button.textContent = "回答を送信";
    }
  });
}
