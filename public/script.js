// Toggle mobile navigation menu
// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");

  // If this page doesn't have the navbar, do nothing
  if (!toggle || !menu) return;

  // Accessibility
  toggle.setAttribute("aria-controls", "nav-menu");
  toggle.setAttribute("aria-expanded", "false");

  const openMenu = () => {
    menu.classList.add("show");
    toggle.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    menu.classList.remove("show");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  // Toggle on hamburger click
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains("show");
    isOpen ? closeMenu() : openMenu();
  });

  // Close when clicking any link
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => closeMenu());
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });

  // Close with ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Optional: close when resizing back to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMenu();
  });
});
// ================= CART SYSTEM (GLOBAL) =================
window.CART_KEY = "gs_cart";

window.getCart = function () {
  try {
    return JSON.parse(localStorage.getItem(window.CART_KEY)) || [];
  } catch (e) {
    return [];
  }
};

window.setCart = function (cart) {
  localStorage.setItem(window.CART_KEY, JSON.stringify(cart));
  window.updateCartCount();
};

window.addToCart = function (item) {
  const cart = window.getCart();
  cart.push({
    id: item.id || Date.now(),
    title: item.title || "Unnamed",
    price: item.price === "" ? "" : Number(item.price || 0),
    category: item.category || "",
    qty: item.qty || 1,
    date: new Date().toISOString(),
  });
  window.setCart(cart);
};

window.updateCartCount = function () {
  const countEl = document.getElementById("cart-count");
  if (!countEl) return;
  countEl.textContent = window.getCart().length;
};

// update on every page load
document.addEventListener("DOMContentLoaded", window.updateCartCount);
