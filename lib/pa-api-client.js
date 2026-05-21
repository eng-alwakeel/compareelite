/**
 * pa-api-client.js — Amazon Creators API v3.1 client (OAuth2 / LWA)
 *
 * Requires env vars:
 *   AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN
 *   AMAZON_PARTNER_TAG (default: compareelite-20)
 */

'use strict';

const https = require('https');

class AmazonCreatorsClient {
  constructor() {
    this.clientId     = process.env.AMAZON_CLIENT_ID;
    this.clientSecret = process.env.AMAZON_CLIENT_SECRET;
    this.partnerTag   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
    this.refreshToken = process.env.AMAZON_REFRESH_TOKEN;
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  // ── OAuth2 token management ─────────────────────────────────────────────────

  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry) {
      return this._accessToken;
    }
    if (!this.refreshToken) {
      throw new Error('AMAZON_REFRESH_TOKEN not set. Run: node scripts/pa-api-test.js --auth-url');
    }
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: this.refreshToken,
      client_id:     this.clientId,
      client_secret: this.clientSecret,
    }).toString();

    const { status, data } = await this._post('api.amazon.com', '/auth/o2/token', body);
    if (status !== 200 || !data.access_token) {
      throw new Error(`Token refresh failed (${status}): ${data.error_description || data.error}`);
    }
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  // ── Public API methods ──────────────────────────────────────────────────────

  async searchProducts(keyword, searchIndex = 'All', count = 6) {
    const token = await this._getAccessToken();
    const params = new URLSearchParams({ keyword, count: String(count) });

    const { status, data } = await this._get(
      'affiliate-program.amazon.com',
      '/v3.1/linker?' + params.toString(),
      { 'Authorization': 'Bearer ' + token, 'x-amzn-associate-tag': this.partnerTag }
    );

    if (status !== 200) {
      throw new Error(`Creators API error (${status}): ${JSON.stringify(data).slice(0, 100)}`);
    }

    const items = data.items || data.results || data.products || data.Items || [];
    return items.map((item) => this._format(item));
  }

  async getProductDetails(asin) {
    const token = await this._getAccessToken();
    const { status, data } = await this._get(
      'affiliate-program.amazon.com',
      `/v3.1/linker?asin=${encodeURIComponent(asin)}&count=1`,
      { 'Authorization': 'Bearer ' + token, 'x-amzn-associate-tag': this.partnerTag }
    );

    if (status !== 200) {
      throw new Error(`Creators API error (${status}): ${JSON.stringify(data).slice(0, 100)}`);
    }

    const items = data.items || data.results || data.products || data.Items || [];
    return items.length > 0 ? this._format(items[0]) : null;
  }

  _format(item) {
    const asin = item.asin || item.ASIN || item.productId || '';
    return {
      asin,
      title:       item.title || item.name || item.ItemInfo?.Title?.DisplayValue || '',
      brand:       item.brand || item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue  || '',
      price:       item.price || item.offers?.[0]?.price || item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A',
      priceAmount: item.priceAmount || item.offers?.[0]?.amount || null,
      image:       item.image || item.imageUrl || item.Images?.Primary?.Large?.URL || null,
      rating:      item.rating || item.CustomerReviews?.StarRating?.DisplayValue  || null,
      reviewCount: item.reviewCount || item.CustomerReviews?.Count?.DisplayValue  || null,
      link:        item.link || item.url || `https://www.amazon.com/dp/${asin}?tag=${this.partnerTag}`,
    };
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  _post(hostname, path, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname, path, method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { reject(new Error('JSON parse error')); } });
      });
      req.on('error', reject); req.write(body); req.end();
    });
  }

  _get(hostname, path, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname, path, method: 'GET',
        headers: { 'Accept': 'application/json', ...extraHeaders }
      }, (res) => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { reject(new Error('JSON parse error: ' + d.slice(0, 100))); } });
      });
      req.on('error', reject); req.end();
    });
  }
}

module.exports = new AmazonCreatorsClient();
