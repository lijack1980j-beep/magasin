const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE_NAME = process.env.CONTACT_TABLE || "contact_messages";

/**
 * Supports:
 * - reCAPTCHA v3 (score exists)
 * - reCAPTCHA v2 (no score)
 */
async function verifyRecaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) return true; // allow if not configured
  if (!token) return false;

  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token,
    }),
  });

  const data = await r.json().catch(() => ({}));

  if (!data.success) return false;

  // v3 has score, v2 doesn't
  if (typeof data.score === "number") {
    return data.score >= 0.5;
  }

  // if no score => treat as v2 => success is enough
  return true;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendTelegram(textPlain) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  // IMPORTANT: use plain text (no HTML) to avoid parse errors
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: textPlain,
      disable_web_page_preview: true,
    }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("Telegram sendMessage failed:", errText);
  }
}

async function sendEmailResend({ name, email, message, productId, productTitle }) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL; // must be verified in Resend
  if (!apiKey || !toEmail || !fromEmail) return;

  const subject = `New Lead: ${productTitle || "Service"} — ${name}`;

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>New Client Lead</h2>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Product:</b> ${escapeHtml(productTitle || "—")}</p>
      <p><b>Product ID:</b> ${escapeHtml(productId || "—")}</p>
      <p><b>Message:</b><br/>${escapeHtml(message || "").replace(/\n/g, "<br/>")}</p>
    </div>
  `;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      reply_to: String(email).trim(),
    }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("Resend email failed:", errText);
  }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  // CORS (safe)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST" });
    }

    const {
      name,
      email,
      message = "",
      productId = "",
      productTitle = "",
      recaptchaToken = "",
    } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "name and email required" });
    }

    // ✅ Verify reCAPTCHA (optional)
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(403).json({ ok: false, error: "Spam detected (reCAPTCHA failed)" });
    }

    // ✅ Save to Supabase
    const { error: dbErr } = await supabase.from(TABLE_NAME).insert({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message || "").trim(),
      product_id: String(productId || "").trim() || null,
      product_title: String(productTitle || "").trim() || null,
      created_at: new Date().toISOString(),
    });

    if (dbErr) {
      return res.status(500).json({ ok: false, error: dbErr.message });
    }

    // ✅ Email + Telegram (don’t block success if they fail)
    await sendEmailResend({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message || "").trim(),
      productId: String(productId || "").trim(),
      productTitle: String(productTitle || "").trim(),
    });

    const tgText =
      `🟦 New Lead\n\n` +
      `👤 Name: ${String(name).trim()}\n` +
      `📧 Email: ${String(email).trim()}\n` +
      `🛒 Product: ${String(productTitle || "—").trim()}\n` +
      `🆔 Product ID: ${String(productId || "—").trim()}\n\n` +
      `💬 Message:\n${String(message || "—").trim()}`;

    await sendTelegram(tgText);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
