const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildBasicEmailHtml = (subject: string, message: string) => {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; }
        .container { max-width: 640px; margin: 0 auto; padding: 16px; }
        .header { background:#033f63; color:#fff; padding:16px; border-radius:8px 8px 0 0; }
        .content { background:#f7f7f7; padding:18px; border-radius:0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h2 style="margin:0">${safeSubject}</h2></div>
        <div class="content">
          <p style="margin-top:0">${safeBody}</p>
        </div>
      </div>
    </body>
  </html>`;
};
