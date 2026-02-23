const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ put your real table name here
const TABLE_NAME = process.env.CONTACT_TABLE || "contact_messages";

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: "name, email, message required" });
    }

    // 1) Save in Supabase
    const { error: dbErr } = await supabase.from(TABLE_NAME).insert({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message).trim(),
    });

    if (dbErr) return res.status(500).json({ error: dbErr.message });

    // 2) Send email to your Gmail (notification)
    // Requires RESEND_API_KEY + CONTACT_TO_EMAIL + FROM_EMAIL in Vercel env vars
    if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.FROM_EMAIL) {
      const subject = `New message from ${String(name).trim()}`;

      const html = `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL,            // must be verified in Resend
          to: [process.env.CONTACT_TO_EMAIL],      // your Gmail address
          subject,
          html,
          reply_to: String(email).trim(),          // so you can reply directly in Gmail
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        // Don’t fail the request if email fails; DB is already saved
        console.error("Resend error:", errText);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
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





import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { name, email, message, productId, productTitle } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "Missing name or email" });
    }

    const subject = `New Client Lead: ${productTitle || "Service"} (${email})`;

    const html = `
      <div style="font-family:Arial,sans-serif">
        <h2>New Client Lead</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Product:</b> ${productTitle || "—"}</p>
        <p><b>Product ID:</b> ${productId || "—"}</p>
        <p><b>Message:</b><br/>${(message || "").replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    const toEmail = process.env.CONTACT_TO_EMAIL; // your gmail

    const sent = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL, // verified sender on Resend
      to: toEmail,
      replyTo: email,
      subject,
      html
    });

    return res.status(200).json({ ok: true, id: sent?.id || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
