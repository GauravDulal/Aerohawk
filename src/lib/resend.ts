// Dependency-free Resend email client using REST API

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AeroHawk Cleaning <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || '';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aerohawk.vercel.app';

interface BookingEmailData {
  ref_code: string;
  name: string;
  email: string;
  service: string;
  date: string;
  start_time: string;
  end_time: string;
}

// ── Helpers ──

function formatDateForEmail(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email send');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Resend API error:', JSON.stringify(errData));
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

// ── Email styles ──

const BRAND_NAVY = '#0a1628';
const BRAND_GOLD = '#c8a85c';

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_NAVY};padding:24px 32px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:3px;">AERO</span><span style="font-size:24px;font-weight:700;color:${BRAND_GOLD};letter-spacing:3px;">HAWK</span>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #e9ecef;text-align:center;">
            <p style="margin:0;font-size:12px;color:#868e96;">AeroHawk Cleaning Services — Clean. Reliable. Professional.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#adb5bd;">This is an automated message. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function bookingDetailsTable(booking: BookingEmailData): string {
  const rows = [
    ['Reference', `<strong style="font-size:16px;letter-spacing:1px;">${booking.ref_code}</strong>`],
    ['Service', booking.service],
    ['Date', formatDateForEmail(booking.date)],
    ['Time', `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`],
    ['Name', booking.name],
  ];

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e9ecef;border-radius:6px;overflow:hidden;">
      ${rows.map(([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="padding:10px 16px;font-size:13px;color:#868e96;width:100px;vertical-align:top;">${label}</td>
          <td style="padding:10px 16px;font-size:13px;color:#212529;">${value}</td>
        </tr>
      `).join('')}
    </table>`;
}

// ── Public API ──

export async function sendBookingConfirmation(booking: BookingEmailData): Promise<boolean> {
  const subject = `Booking Confirmed — ${booking.ref_code}`;
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_NAVY};">Booking Confirmed ✓</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#495057;">
      Hi <strong>${booking.name}</strong>, your cleaning has been booked successfully.
    </p>
    ${bookingDetailsTable(booking)}
    <p style="margin:20px 0 0;font-size:13px;color:#495057;">
      You can manage your booking at any time using your reference code:
    </p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${SITE_URL}/booking/${booking.ref_code}"
         style="display:inline-block;background:${BRAND_NAVY};color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        View Booking
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#adb5bd;text-align:center;">
      Need to cancel? Visit the link above and follow the instructions.
    </p>
  `);

  return sendEmail(booking.email, subject, html);
}

export async function sendBookingCancellation(booking: BookingEmailData): Promise<boolean> {
  const subject = `Booking Cancelled — ${booking.ref_code}`;
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#e05555;">Booking Cancelled</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#495057;">
      Hi <strong>${booking.name}</strong>, your booking has been cancelled as requested.
    </p>
    ${bookingDetailsTable(booking)}
    <p style="margin:20px 0 0;font-size:14px;color:#495057;">
      Would you like to reschedule? You can book a new appointment anytime:
    </p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${SITE_URL}/book"
         style="display:inline-block;background:${BRAND_NAVY};color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        Book Again
      </a>
    </div>
  `);

  return sendEmail(booking.email, subject, html);
}

export async function sendAdminNotification(
  booking: BookingEmailData,
  type: 'new_booking' | 'cancellation'
): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.warn('ADMIN_NOTIFICATION_EMAIL not set — skipping admin notification');
    return false;
  }

  const isNew = type === 'new_booking';
  const subject = isNew
    ? `New Booking: ${booking.service} — ${booking.ref_code}`
    : `Booking Cancelled: ${booking.ref_code}`;

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${isNew ? '#27ae60' : '#e05555'};">
      ${isNew ? '🆕 New Booking' : '❌ Booking Cancelled'}
    </h2>
    <p style="margin:0 0 16px;font-size:14px;color:#495057;">
      ${isNew ? 'A new booking has been placed.' : 'A customer has cancelled their booking.'}
    </p>
    ${bookingDetailsTable(booking)}
    <p style="margin:16px 0 4px;font-size:13px;color:#868e96;">Customer email:</p>
    <p style="margin:0;font-size:14px;"><a href="mailto:${booking.email}" style="color:${BRAND_NAVY};">${booking.email}</a></p>
  `);

  return sendEmail(ADMIN_EMAIL, subject, html);
}
