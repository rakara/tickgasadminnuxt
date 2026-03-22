/**
 * SMS notifications via Africa's Talking API.
 *
 * Required env vars:
 *   AT_API_KEY   — Africa's Talking API key
 *   AT_USERNAME  — Africa's Talking username (use 'sandbox' for testing)
 *   AT_SENDER_ID — Short code / sender name (optional; omit for default)
 */

const AT_BASE = 'https://api.africastalking.com/version1/messaging';

/**
 * Send an SMS to one or more recipients.
 * @param {string|string[]} to  - E.164 format, e.g. '+254712345678'
 * @param {string}          message
 * @returns {Promise<{success:boolean, error?:string}>}
 */
export async function sendSMS(to, message) {
  const apiKey   = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    console.warn('SMS: AT_API_KEY / AT_USERNAME not set — skipping SMS.');
    return { success: false, error: 'SMS not configured' };
  }

  const recipients = Array.isArray(to) ? to.join(',') : to;
  // Africa's Talking expects numbers prefixed with '+'
  const formattedTo = recipients
    .split(',')
    .map(n => n.trim().startsWith('+') ? n.trim() : '+' + n.trim())
    .join(',');

  const params = new URLSearchParams({
    username,
    to: formattedTo,
    message,
    ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {})
  });

  try {
    const response = await fetch(AT_BASE, {
      method: 'POST',
      headers: {
        apiKey,
        Accept:         'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.SMSMessageData?.Recipients?.[0]?.statusCode !== 101) {
      console.error('SMS send failed:', JSON.stringify(data));
      return { success: false, error: JSON.stringify(data) };
    }

    return { success: true };
  } catch (err) {
    console.error('SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Templated notification helpers ───────────────────────────────────────────

export function smsOrderConfirmed(phone, orderNumber, supplierName, etaMinutes) {
  return sendSMS(phone,
    `TickGas: Your order ${orderNumber} is confirmed! ` +
    `${supplierName} will deliver in ~${etaMinutes} mins. ` +
    `Track at tickgas.com/tracking.html?orderId=<id>`
  );
}

export function smsOutForDelivery(phone, orderNumber, supplierPhone) {
  return sendSMS(phone,
    `TickGas: Your gas is on the way! Order ${orderNumber}. ` +
    `Call your supplier: ${supplierPhone}. Thank you!`
  );
}

export function smsOrderDelivered(phone, orderNumber) {
  return sendSMS(phone,
    `TickGas: Order ${orderNumber} delivered! Please rate your experience at tickgas.com. Thank you for choosing TickGas.`
  );
}

export function smsSupplierNewOrder(phone, orderNumber, gasSize, qty, area) {
  return sendSMS(phone,
    `TickGas NEW ORDER: ${orderNumber} — ${qty}x ${gasSize} to ${area}. ` +
    `Log in to your dashboard to accept: tickgas.com/supplier/orders.html`
  );
}

export function smsSupplierApproved(phone, businessName) {
  return sendSMS(phone,
    `TickGas: Congratulations ${businessName}! Your supplier account has been approved. ` +
    `Log in at tickgas.com/supplier/login.html to start receiving orders.`
  );
}

export function smsSupplierRejected(phone, businessName, reason) {
  return sendSMS(phone,
    `TickGas: Your supplier application for ${businessName} was not approved. ` +
    `Reason: ${reason || 'See email for details'}. Contact support@tickgas.com for help.`
  );
}
