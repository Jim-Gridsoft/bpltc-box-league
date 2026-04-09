import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY is not set — emails will not be sent.");
    return null;
  }
  if (!_resend) {
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getAppUrl(): string {
  return process.env.APP_URL || "https://bpltc-box-league-155ff8f71204.herokuapp.com";
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetToken: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const resetUrl = `${getAppUrl()}/reset-password?token=${opts.resetToken}`;

  try {
    const { error } = await resend.emails.send({
      from: "BPLTC Box League <noreply@bpltcboxleague.com>",
      to: opts.to,
      subject: "Reset your BPLTC Box League password",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f0e8; margin: 0; padding: 32px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1a3a2a; padding: 24px 32px;">
      <h1 style="color: #f5f0e8; font-family: Georgia, serif; font-size: 22px; margin: 0;">BPLTC Doubles Box League</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a3a2a; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #444; line-height: 1.6;">Hi ${opts.name},</p>
      <p style="color: #444; line-height: 1.6;">
        We received a request to reset the password for your BPLTC Box League account.
        Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="background: #1a3a2a; color: #f5f0e8; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color: #888; font-size: 13px; line-height: 1.6;">
        If you did not request a password reset, you can safely ignore this email — your password will not change.
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.6;">
        If the button above does not work, copy and paste this link into your browser:<br />
        <a href="${resetUrl}" style="color: #1a3a2a; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div style="background: #f5f0e8; padding: 16px 32px; text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        &copy; 2026 Bramhall Park Lawn Tennis Club &bull;
        <a href="${getAppUrl()}/privacy" style="color: #888;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error("[Email] Failed to send password reset email:", error);
      return false;
    }

    console.log(`[Email] Password reset email sent to ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Unexpected error sending password reset email:", err);
    return false;
  }
}
