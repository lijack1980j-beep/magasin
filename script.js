// Toggle mobile navigation menu
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });

  // Close the mobile menu when a link is clicked
  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
      }
    });
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