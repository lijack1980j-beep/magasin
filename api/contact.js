const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE_NAME = process.env.CONTACT_TABLE || "contact_messages";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST" });
    }

    const {
      name,
      email,
      message,
      productId,
      productTitle
    } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "name and email required" });
    }

    // ✅ 1) Save in Supabase
    const { error: dbErr } = await supabase.from(TABLE_NAME).insert({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message || "").trim(),
      product_id: productId || null,
      product_title: productTitle || null
    });

    if (dbErr) {
      return res.status(500).json({ ok: false, error: dbErr.message });
    }

    // ✅ 2) Send email using Resend
    if (
      process.env.RESEND_API_KEY &&
      process.env.CONTACT_TO_EMAIL &&
      process.env.CONTACT_FROM_EMAIL
    ) {
      const subject = `New Lead: ${productTitle || "Service"} — ${name}`;

      const html = `
        <div style="font-family:Arial,sans-serif">
          <h2>New Client Lead</h2>
          <p><b>Name:</b> ${escapeHtml(name)}</p>
          <p><b>Email:</b> ${escapeHtml(email)}</p>
          <p><b>Product:</b> ${escapeHtml(productTitle || "—")}</p>
          <p><b>Product ID:</b> ${escapeHtml(productId || "—")}</p>
          <p><b>Message:</b><br/>
            ${escapeHtml(message || "").replace(/\n/g, "<br/>")}
          </p>
        </div>
      `;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM_EMAIL, // must be verified in Resend
          to: [process.env.CONTACT_TO_EMAIL],    // your Gmail
          subject,
          html,
          reply_to: String(email).trim()
        })
      });

      if (!r.ok) {
        const errText = await r.text();
        console.error("Resend error:", errText);
      }
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
