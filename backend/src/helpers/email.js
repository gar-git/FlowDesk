import nodemailer from 'nodemailer';

let transporter;

/** True when env has enough to send (host + from address) */
export function isEmailConfigured() {
    return Boolean(
        String(process.env.SMTP_HOST || '').trim() &&
        String(process.env.SMTP_FROM || '').trim()
    );
}

function getTransporter() {
    if (transporter) return transporter;
    if (!isEmailConfigured()) return null;
    const host = String(process.env.SMTP_HOST).trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || '') === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth:
            user && String(user).length
                ? { user: String(user), pass: pass != null ? String(pass) : '' }
                : undefined,
    });
    return transporter;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Notify assignee that a task was assigned to them.
 * No-op (returns { skipped: true }) if SMTP is not configured.
 */
export async function sendTaskAssignedEmail({ to, assigneeFirstName, taskTitle, appUrl: rawUrl }) {
    const t = getTransporter();
    if (!t) {
        return { skipped: true, reason: 'smtp_not_configured' };
    }
    const toAddr = String(to || '').trim();
    if (!toAddr) {
        return { skipped: true, reason: 'no_recipient' };
    }

    const from = String(process.env.SMTP_FROM).trim();
    const appUrl = (rawUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const title = (taskTitle && String(taskTitle).trim()) || 'New task';
    const greet = assigneeFirstName && String(assigneeFirstName).trim() ? ` ${String(assigneeFirstName).trim()}` : '';

    const subject = `You were assigned: ${title}`;
    const text = `Hi${greet},

You have a new task assigned to you in FlowDesk.

${title}

Open the app: ${appUrl}
`;

    const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#1a1a2e;">
  <p>Hi${greet ? escapeHtml(greet) : ''},</p>
  <p>You have a new task assigned to you in <strong>FlowDesk</strong>.</p>
  <p style="font-size:16px;font-weight:600;">${escapeHtml(title)}</p>
  <p><a href="${escapeHtml(appUrl)}">Open FlowDesk</a></p>
</body></html>`;

    await t.sendMail({
        from,
        to: toAddr,
        subject,
        text,
        html,
    });
    return { sent: true, to: toAddr };
}

/** Safe for terminal logs (not the full address) */
export function maskEmailForLog(addr) {
    const s = String(addr || '').trim();
    if (!s) return '(no address)';
    const at = s.indexOf('@');
    if (at <= 0) return '***';
    const user = s.slice(0, at);
    const domain = s.slice(at + 1);
    const vis = user.length <= 2 ? user[0] + '*' : user[0] + '***' + user.slice(-1);
    return `${vis}@${domain}`;
}
