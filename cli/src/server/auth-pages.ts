/**
 * Server-rendered pages for sign-in and OAuth consent. Self-contained (inline
 * CSS, no scripts) because they are served before the user may load the app.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const STYLE = `
  :root { color-scheme: light dark; --fg: #1b1b18; --muted: #6b6a63; --bg: #faf9f5; --rule: #dedcd2; --accent: #c2410c; --risk: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --fg: #ecebe4; --muted: #a3a29a; --bg: #171714; --rule: #34332d; --accent: #fb923c; --risk: #f87171; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg);
    font: 17px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: min(26rem, calc(100vw - 2rem)); }
  h1 { font-size: 1.5rem; line-height: 1.25; margin: 0 0 .5rem; }
  p { margin: 0 0 1rem; color: var(--muted); }
  .error { color: var(--risk); }
  form { margin: 0 0 1rem; }
  label { display: block; font-weight: 600; margin-bottom: .35rem; }
  input[type=text] { width: 100%; font: 600 1.5rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .3em;
    padding: .6rem .75rem; border: 1px solid var(--rule); border-radius: 6px; background: transparent; color: var(--fg); }
  button { font: inherit; font-weight: 600; padding: .55rem 1rem; border-radius: 6px; border: 1px solid var(--accent);
    background: var(--accent); color: #fff; cursor: pointer; }
  button.secondary { background: transparent; color: var(--fg); border-color: var(--rule); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .row { display: flex; gap: .75rem; margin-top: .75rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 1.5rem 0; }
`

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · Visual Artifact Renderer</title>
<style>${STYLE}</style>
</head>
<body><main>${body}</main></body>
</html>`
}

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "That code didn't work. Try again.",
  expired: "That code expired. Send a new one.",
  locked: "Too many wrong tries. Send a new code.",
  send: "Could not post the code to Slack. Try again in a moment.",
  wait: "A code was sent moments ago. Check Slack, or wait before asking for another.",
}

export interface LoginPageOptions {
  returnTo: string
  sent: boolean
  error: string | null
  waitSeconds: number
  ttlMinutes: number
}

export function loginPage(options: LoginPageOptions): string {
  const returnTo = `<input type="hidden" name="return_to" value="${escapeHtml(options.returnTo)}">`
  const error = options.error && LOGIN_ERRORS[options.error]
    ? `<p class="error" role="alert">${escapeHtml(LOGIN_ERRORS[options.error])}</p>`
    : ""
  const waiting = options.waitSeconds > 0
  const sendButton = `<form method="post" action="/login">${returnTo}
      <button type="submit"${options.sent ? ' class="secondary"' : ""}${waiting ? " disabled" : ""}>${options.sent ? "Send a new code" : "Send code to Slack"}</button>
      ${waiting ? `<p>You can ask for another code in ${options.waitSeconds}s. Reload to check.</p>` : ""}
    </form>`

  if (!options.sent) {
    return layout("Sign in", `
    <h1>Sign in</h1>
    <p>A 6-digit code will be posted to your Slack.</p>
    ${error}
    ${sendButton}`)
  }

  return layout("Enter code", `
    <h1>Check Slack</h1>
    <p>Enter the 6-digit code posted to your Slack. It works for ${options.ttlMinutes} minutes.</p>
    ${error}
    <form method="post" action="/login/verify">${returnTo}
      <label for="code">Code</label>
      <input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus>
      <div class="row"><button type="submit">Sign in</button></div>
    </form>
    <hr>
    ${sendButton}`)
}

export function consentPage(clientName: string, redirectUri: string, params: URLSearchParams): string {
  const hidden = ["response_type", "client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "resource", "scope"]
    .filter((key) => params.has(key))
    .map((key) => `<input type="hidden" name="${key}" value="${escapeHtml(params.get(key) ?? "")}">`)
    .join("\n      ")
  const host = (() => {
    try {
      return new URL(redirectUri).host
    } catch {
      return redirectUri
    }
  })()
  return layout("Allow access", `
    <h1>Allow ${escapeHtml(clientName)}?</h1>
    <p>It will be able to create, read and list visual artifacts on this server. After you approve, you go back to <code>${escapeHtml(host)}</code>.</p>
    <form method="post" action="/oauth/authorize">
      ${hidden}
      <div class="row">
        <button type="submit" name="decision" value="approve">Allow</button>
        <button type="submit" name="decision" value="deny" class="secondary">Deny</button>
      </div>
    </form>`)
}

export function errorPage(title: string, message: string): string {
  return layout(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`)
}
