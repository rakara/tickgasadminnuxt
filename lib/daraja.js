/**
 * lib/daraja.js — Safaricom Daraja API (M-PESA STK Push) client
 *
 * Required env vars:
 *   MPESA_CONSUMER_KEY      — Daraja app consumer key
 *   MPESA_CONSUMER_SECRET   — Daraja app consumer secret
 *   MPESA_PASSKEY           — STK push passkey from Daraja portal
 *   MPESA_SHORTCODE         — Till/paybill number (default: 174379 sandbox)
 *   MPESA_ENVIRONMENT       — 'sandbox' | 'production' (default: 'sandbox')
 *   NEXT_PUBLIC_APP_URL     — Public base URL for the callback (e.g. https://tickgas.vercel.app)
 *
 * Note on token caching:
 *   Vercel serverless functions may reuse warm instances, so in-memory token
 *   caching between invocations is intentional and safe. Each cold start begins
 *   with a fresh token fetch. The cache window is (expires_in - 60 s) to avoid
 *   using a token that expires mid-request.
 */

import axios from 'axios';

class DarajaAPI {
  constructor() {
    // Credentials are read from env vars at runtime (not module load) so that
    // the module can be imported without crashing in test/CI environments.
    this.consumerKey    = null;
    this.consumerSecret = null;
    this.passkey        = null;

    this.shortCode   = process.env.MPESA_SHORTCODE   || '174379';
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    this.baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // In-memory token cache — valid within a single warm serverless instance
    this.token       = null;
    this.tokenExpiry = null;
  }

  /**
   * Validates that all required environment variables are set.
   * Called before any API operation so failures are explicit and traceable.
   * @throws {Error} if any required env var is missing
   */
  _validateConfig() {
    const missing = [];
    if (!process.env.MPESA_CONSUMER_KEY)    missing.push('MPESA_CONSUMER_KEY');
    if (!process.env.MPESA_CONSUMER_SECRET) missing.push('MPESA_CONSUMER_SECRET');
    if (!process.env.MPESA_PASSKEY)         missing.push('MPESA_PASSKEY');
    if (!process.env.NEXT_PUBLIC_APP_URL)   missing.push('NEXT_PUBLIC_APP_URL');
    if (missing.length) {
      throw new Error(`M-PESA config missing env vars: ${missing.join(', ')}`);
    }
    // Assign lazily so tests that don't call M-PESA methods are not affected
    this.consumerKey    = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey        = process.env.MPESA_PASSKEY;
  }

  /**
   * Fetches or returns a cached OAuth access token from Daraja.
   * Token is cached in memory until 60 s before expiry.
   * @returns {Promise<string>} access token
   */
  async getAccessToken() {
    this._validateConfig();

    // Return cached token if still valid
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      );

      this.token       = response.data.access_token;
      // Cache until 60 s before the token actually expires
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60_000;

      console.log('[Daraja] Access token obtained');
      return this.token;
    } catch (error) {
      console.error('[Daraja] Failed to get access token:', error.response?.data || error.message);
      throw new Error('Failed to get M-PESA access token');
    }
  }

  /**
   * Initiates an STK Push payment prompt on the customer's phone.
   *
   * @param {string} phone       — customer phone (any Kenyan format)
   * @param {number} amount      — amount in KES (will be rounded to integer)
   * @param {string} orderId     — used in the transaction description
   * @param {string} [accountReference='TickGas'] — paybill account reference
   * @returns {Promise<{success: boolean, checkoutRequestID?: string, error?: string, data?: object}>}
   */
  async stkPush(phone, amount, orderId, accountReference = 'TickGas') {
    this._validateConfig();

    try {
      const token     = await this.getAccessToken();
      const timestamp = this._getTimestamp();
      const password  = Buffer.from(
        `${this.shortCode}${this.passkey}${timestamp}`
      ).toString('base64');

      const callbackURL      = `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`;
      const formattedPhone   = this._formatPhoneNumber(phone);

      const payload = {
        BusinessShortCode: this.shortCode,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.round(amount),
        PartyA:            formattedPhone,
        PartyB:            this.shortCode,
        PhoneNumber:       formattedPhone,
        CallBackURL:       callbackURL,
        AccountReference:  accountReference,
        TransactionDesc:   `Payment for gas order ${orderId}`
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[Daraja] STK Push initiated:', response.data.ResponseDescription);

      return {
        success:             true,
        data:                response.data,
        checkoutRequestID:   response.data.CheckoutRequestID,
        responseCode:        response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage:     response.data.CustomerMessage
      };
    } catch (error) {
      console.error('[Daraja] STK Push error:', error.response?.data || error.message);
      return {
        success: false,
        error:   error.response?.data?.errorMessage || 'Failed to initiate M-PESA payment'
      };
    }
  }

  /**
   * Queries the status of a pending STK Push transaction.
   * ResultCode is always normalised to a string for consistent comparison.
   *
   * @param {string} checkoutRequestID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async queryStatus(checkoutRequestID) {
    this._validateConfig();

    try {
      const token     = await this.getAccessToken();
      const timestamp = this._getTimestamp();
      const password  = Buffer.from(
        `${this.shortCode}${this.passkey}${timestamp}`
      ).toString('base64');

      const payload = {
        BusinessShortCode: this.shortCode,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Normalise ResultCode to string — M-PESA sometimes returns integer 0
      const data = {
        ...response.data,
        ResultCode: response.data.ResultCode !== undefined
          ? String(response.data.ResultCode)
          : undefined
      };

      return { success: true, data };
    } catch (error) {
      // M-PESA returns error details in the response body (not just the HTTP error)
      if (error.response?.data) {
        console.error('[Daraja] Query status error (has body):', error.response.data);
        const data = {
          ...error.response.data,
          ResultCode: error.response.data.ResultCode !== undefined
            ? String(error.response.data.ResultCode)
            : undefined
        };
        // Return the body — callers can inspect ResultCode to determine outcome
        return { success: true, data };
      }

      console.error('[Daraja] Query status error (no body):', error.message);
      return {
        success: false,
        error:   error.message || 'Failed to query payment status'
      };
    }
  }

  /**
   * Returns the current timestamp in the format required by Daraja (YYYYMMDDHHmmss).
   * @returns {string}
   */
  _getTimestamp() {
    const now    = new Date();
    const pad    = (n) => String(n).padStart(2, '0');
    return (
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }

  /**
   * Normalises a Kenyan phone number to the international format (2547XXXXXXXX).
   * Accepted input formats:
   *   07XXXXXXXX   — local format with leading 0
   *   7XXXXXXXX    — without leading 0
   *   2547XXXXXXXX — already international
   *
   * @param {string} phone
   * @returns {string} normalised phone number
   */
  _formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }
}

export default new DarajaAPI();
