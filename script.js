const form = document.getElementById("form");
const text = document.getElementById("text");
const list = document.getElementById("list");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const li = document.createElement("li");
  li.textContent = text.value;
  list.appendChild(li);

  text.value = "";
});