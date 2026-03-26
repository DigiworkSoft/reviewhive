import nodemailer from 'nodemailer';

interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalScans: number;
  reviewsPosted: number;
  conversionRate: number;
  avgRating: number;
  topCourse: string;
  negativeFeedbackCount: number;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendWeeklyDigest(stats: WeeklyStats, toEmail: string) {
  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/dashboard`
    : 'http://localhost:3000/admin/dashboard';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">Weekly Review Summary</h1>
            <p style="margin:6px 0 0;color:#a0a0c0;font-size:14px;">${stats.weekStart} — ${stats.weekEnd}</p>
          </td>
        </tr>
        <!-- KPI Table -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Total QR Scans</td>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:18px;color:#1a1a2e;">${stats.totalScans}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Reviews Posted</td>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:18px;color:#1a1a2e;">${stats.reviewsPosted}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Conversion Rate</td>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:18px;color:#1a1a2e;">${stats.conversionRate}%</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Avg Star Rating</td>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:18px;color:#1a1a2e;">${stats.avgRating} ⭐</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Top Course</td>
                <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:14px;color:#1a1a2e;">${stats.topCourse || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#666;font-size:14px;">Negative Feedback</td>
                <td style="padding:12px 16px;text-align:right;font-weight:bold;font-size:18px;color:#e25c3d;">${stats.negativeFeedbackCount}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${dashboardUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;font-size:14px;">View Dashboard →</a>
          </td>
        </tr>
      </table>
      <p style="margin-top:16px;color:#999;font-size:11px;">This is an automated email from ReviewHive.</p>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `ReviewHive <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Weekly Review Summary — ${stats.weekStart} to ${stats.weekEnd}`,
    html,
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  // Ultra-simple HTML for 100% delivery and visibility
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #1a1a2e;">Password Reset Request</h2>
      <p>We received a request to reset your ReviewHive password. Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #666;">If the button doesn't work, copy-paste this link in your browser:</p>
      <p style="font-size: 12px; color: #3b82f6; word-break: break-all;">${resetLink}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999;">This link will expire in 15 minutes. If you didn't request this, ignore this mail.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"ReviewHive Security" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset Your ReviewHive Password',
    text: `Reset your password by following this link: ${resetLink}. It expires in 15 minutes.`,
    html,
  });
}

