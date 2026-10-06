import type { Env } from "./util";

// Workers SMTP bağlantısı açamıyor; mail Resend'in HTTP API'siyle gönderilir (ücretsiz: günde 100 mail).
// RESEND_API_KEY yoksa ve ENVIRONMENT=development ise bağlantı yalnızca loga yazılır.

export class EmailNotConfigured extends Error {}

export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) throw new EmailNotConfigured("RESEND_API_KEY tanımlı değil");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function sendPasswordResetEmail(env: Env, to: string, token: string, origin: string): Promise<void> {
  const resetURL = `${(env.APP_URL || origin).replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  if (!env.RESEND_API_KEY && env.ENVIRONMENT === "development") {
    console.log(`[dev] RESEND_API_KEY yok; ${to} için şifre sıfırlama bağlantısı: ${resetURL}`);
    return;
  }

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#0B0D12;font-family:Inter,Segoe UI,Arial,sans-serif;color:#E7E9EE">
  <div style="max-width:520px;margin:0 auto;background:#12161E;border:1px solid #232938;border-radius:16px;padding:28px">
    <h2 style="margin:0 0 12px;font-size:20px">Şifre sıfırlama isteği</h2>
    <p style="color:#8A93A6;line-height:1.6">Hesabın için bir şifre sıfırlama isteği aldık. Yeni şifre belirlemek için aşağıdaki butona tıkla:</p>
    <p style="margin:24px 0"><a href="${resetURL}" style="display:inline-block;padding:12px 20px;background:#7C5CFF;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Şifremi sıfırla</a></p>
    <p style="color:#8A93A6;font-size:13px;line-height:1.6">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br><span style="color:#A895FF;word-break:break-all">${resetURL}</span></p>
    <p style="color:#5B6478;font-size:12px;margin-top:24px">Bağlantı 1 saat geçerlidir. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.</p>
  </div>
</body>
</html>`;
  await sendEmail(env, to, "Kiroku · Şifre sıfırlama", html);
}
