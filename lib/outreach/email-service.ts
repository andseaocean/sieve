/**
 * Email Service using Resend
 *
 * Handles sending outreach emails to candidates.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendOutreachEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  // Use Resend test address if no custom domain configured
  // For testing: onboarding@resend.dev (can only send to your own email)
  // For production: use your verified domain
  const fromEmail = process.env.OUTREACH_FROM_EMAIL || 'Vamos Team <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert plain text message to HTML email format
 */
export function formatEmailHtml(message: string, candidateName?: string): string {
  // Convert newlines to paragraphs
  const paragraphs = message
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(line)}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vamos Team</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Vamos
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px; color: #374151; font-size: 16px;">
              ${paragraphs}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                З повагою,<br>
                <strong>Команда Vamos</strong>
              </p>
            </td>
          </tr>
        </table>
        <!-- Unsubscribe -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 24px auto 0;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Ви отримали цей лист, тому що подали заявку на роботу в Vamos.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Generate email subject for introduction message
 */
export function generateEmailSubject(candidateFirstName: string): string {
  return `${candidateFirstName}, дякуємо за інтерес до Vamos!`;
}

/**
 * Generate email subject for test task message
 */
export function generateTestTaskEmailSubject(candidateFirstName: string, positionTitle: string): string {
  return `${candidateFirstName}, ваше тестове завдання для позиції ${positionTitle}`;
}
