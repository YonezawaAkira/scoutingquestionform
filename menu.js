const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  siteMenu.hidden = isOpen;
});
