const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE_NAME = process.env.CONTACT_TABLE || "contact_messages";

async function verifyRecaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) return true; // allow if not configured

  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token
    })
  });

  const data = await r.json();
  return data.success && data.score > 0.5;
}

async function sendTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML"
      })
    }
  );
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST")
      return res.status(405).json({ ok: false, error: "Use POST" });

    const {
      name,
      email,
      message,
      productId,
      productTitle,
      recaptchaToken
    } = req.body || {};

    if (!name || !email)
      return res.status(400).json({ ok: false, error: "name and email required" });

    // ✅ Verify reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman)
      return res.status(403).json({ ok: false, error: "Spam detected" });

    // ✅ Save to Supabase
    const { error: dbErr } = await supabase.from(TABLE_NAME).insert({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message || "").trim(),
      product_id: productId || null,
      product_title: productTitle || null
    });

    if (dbErr)
      return res.status(500).json({ ok: false, error: dbErr.message });

    // ✅ Send Email (Resend)
    if (
      process.env.RESEND_API_KEY &&
      process.env.CONTACT_TO_EMAIL &&
      process.env.CONTACT_FROM_EMAIL
    ) {
      const subject = `New Lead: ${productTitle || "Service"} — ${name}`;

      const html = `
        <div style="font-family:Arial">
          <h2>New Client Lead</h2>
          <p><b>Name:</b> ${escapeHtml(name)}</p>
          <p><b>Email:</b> ${escapeHtml(email)}</p>
          <p><b>Product:</b> ${escapeHtml(productTitle || "—")}</p>
          <p><b>Message:</b><br/>
            ${escapeHtml(message || "").replace(/\n/g, "<br/>")}
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM_EMAIL,
          to: [process.env.CONTACT_TO_EMAIL],
          subject,
          html,
          reply_to: String(email).trim()
        })
      });
    }

    // ✅ Send Telegram notification
    const tgMessage = `
<b>New Lead</b>
<b>Name:</b> ${escapeHtml(name)}
<b>Email:</b> ${escapeHtml(email)}
<b>Product:</b> ${escapeHtml(productTitle || "—")}
<b>Message:</b> ${escapeHtml(message || "—")}
    `.trim();

    await sendTelegram(tgMessage);

    return res.status(200).json({ ok: true });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
