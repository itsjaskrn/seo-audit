export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Privacy Policy</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; line-height: 1.6; max-width: 800px; margin: auto; }
        h1, h2 { color: #333; }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p>This tool analyzes publicly accessible web pages for SEO purposes. No personal data is collected or stored.</p>
      <h2>1. No Data Collection</h2>
      <p>No names, emails, IP addresses, or identifiers are stored.</p>
      <h2>2. Public Page Analysis Only</h2>
      <p>Only content from publicly accessible URLs is scanned.</p>
      <h2>3. No Cookies or Tracking</h2>
      <p>No cookies, scripts, or persistent tracking methods are used.</p>
    </body>
    </html>
  `);
}
