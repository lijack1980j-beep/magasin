// store-data.js
// Loads projects created in admin.html (localStorage "gs_projects") and renders them into store pages.

const KEY_PROJECTS = "gs_projects";

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch (e) { return fallback; }
}

function getProjects() {
  return safeParse(localStorage.getItem(KEY_PROJECTS), []);
}

function categoryLabel(category) {
  if (category === "uiux") return "UI/UX";
  if (category === "interior") return "Interior";
  if (category === "exterior") return "Exterior";
  return category;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStoreProducts(options) {
  const { category, gridId } = options;

  const grid = document.getElementById(gridId);
  if (!grid) return;

  const all = getProjects();
  const products = all.filter(p => (p.category || "") === category);

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1;">
        <div class="product-info">
          <h3>No products yet</h3>
          <p>Create products from the Admin page, then refresh.</p>
          <div class="price">${escapeHtml(categoryLabel(category))}</div>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => {
    const title = escapeHtml(p.title);
    const desc = escapeHtml(p.desc || "");
    const image = escapeHtml(p.image || "");
    const priceText = (p.price === "" || p.price === null || typeof p.price === "undefined")
      ? "—"
      : `$${Number(p.price).toFixed(2)}`;

    const priceRaw = escapeHtml(String(p.price ?? ""));

    return `
      <div class="product-card" data-id="${escapeHtml(p.id)}">
        <div class="product-image-wrapper">
          <a class="details-link" href="project-detail.html?id=${encodeURIComponent(p.id)}" style="display:block;">
            ${
              (p.videoUrl && String(p.videoUrl).trim() !== "")
                ? `<video src="${escapeHtml(p.videoUrl)}" muted playsinline style="width:100%; border-radius:12px;"></video>`
                : `<img src="${image}" alt="${title}">`
            }
          </a>
        </div>

        <div class="product-info">
          <h3>
            <a class="details-link" href="project-detail.html?id=${encodeURIComponent(p.id)}" style="color:inherit; text-decoration:none;">
              ${title}
            </a>
          </h3>

          <p>${desc}</p>
          <div class="price">${priceText}</div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button
              class="add-cart-btn"
              type="button"
              data-id="${escapeHtml(p.id)}"
              data-title="${title}"
              data-price="${priceRaw}"
              data-category="${escapeHtml(category)}"
            >
              Add to Cart
            </button>

            <a class="details-btn"
               href="project-detail.html?id=${encodeURIComponent(p.id)}"
               style="display:inline-flex; align-items:center; justify-content:center; text-decoration:none;"
            >
              View Details
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // ✅ IMPORTANT: only buttons should add to cart
  grid.querySelectorAll("button.add-cart-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (typeof window.addToCart !== "function") {
        alert("addToCart() not found. Make sure script.js is loaded BEFORE store-data.js");
        return;
      }

      window.addToCart({
        id: btn.dataset.id,
        title: btn.dataset.title,
        price: btn.dataset.price,
        category: btn.dataset.category
      });

      // if you have updateCartCount in script.js, this updates navbar instantly
      if (typeof window.updateCartCount === "function") window.updateCartCount();

     
    });
  });
}
