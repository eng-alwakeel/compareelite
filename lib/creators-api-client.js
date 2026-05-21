'use strict';

const https = require('https');

const TOKEN_ENDPOINT_HOST = 'api.amazon.com';
const TOKEN_ENDPOINT_PATH = '/auth/o2/token';
const API_HOST            = 'creatorsapi.amazon';
const SCOPE               = 'creatorsapi::default';
const GRANT_TYPE          = 'client_credentials';

const SEARCH_RESOURCES = [
  'Images.Primary.Large',
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'OffersV2.Listings.Price',
  'CustomerReviews.StarRating',
  'CustomerReviews.Count',
];

const ITEMS_RESOURCES = [
  'Images.Primary.Large',
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'OffersV2.Listings.Price',
  'CustomerReviews.StarRating',
  'CustomerReviews.Count',
];

class CreatorsApiClient {
  constructor() {
    this.clientId     = process.env.AMAZON_CLIENT_ID;
    this.clientSecret = process.env.AMAZON_CLIENT_SECRET;
    this.partnerTag   = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
    this.marketplace  = 'www.amazon.com';
    this.version      = '3.1';
    this._token       = null;
    this._tokenExpiry = 0;
  }

  // ── Token management ────────────────────────────────────────────────────────

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;

    const body = new URLSearchParams({
      grant_type:    GRANT_TYPE,
      client_id:     this.clientId,
      client_secret: this.clientSecret,
      scope:         SCOPE,
    }).toString();

    const { status, data } = await this._post(TOKEN_ENDPOINT_HOST, TOKEN_ENDPOINT_PATH, body);

    if (status !== 200 || !data.access_token) {
      throw new Error(
        `Token error (${status}): ${data.error_description || data.error || JSON.stringify(data)}`
      );
    }

    this._token       = data.access_token;
    this._tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
    return this._token;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async searchItems(keywords, count = 6) {
    const token = await this._getToken();
    const payload = {
      keywords,
      partnerTag:  this.partnerTag,
      resources:   SEARCH_RESOURCES,
      itemCount:   count,
    };

    const { status, data } = await this._apiPost(token, '/catalog/v1/searchItems', payload);
    if (status !== 200) {
      throw new Error(`searchItems error (${status}): ${JSON.stringify(data).slice(0, 200)}`);
    }

    const items = data?.SearchResult?.Items || data?.searchResult?.items || [];
    return items.map((i) => this._format(i));
  }

  async getItems(asins) {
    const token = await this._getToken();
    const payload = {
      itemIds:    Array.isArray(asins) ? asins : [asins],
      partnerTag: this.partnerTag,
      resources:  ITEMS_RESOURCES,
    };

    const { status, data } = await this._apiPost(token, '/catalog/v1/getItems', payload);
    if (status !== 200) {
      throw new Error(`getItems error (${status}): ${JSON.stringify(data).slice(0, 200)}`);
    }

    const items = data?.ItemsResult?.Items || data?.itemsResult?.items || [];
    return items.map((i) => this._format(i));
  }

  _format(item) {
    const asin  = item?.ASIN  || item?.asin  || '';
    const title = item?.ItemInfo?.Title?.DisplayValue
               || item?.itemInfo?.title?.displayValue
               || '';
    const brand = item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue
               || item?.itemInfo?.byLineInfo?.brand?.displayValue
               || '';
    const price = item?.OffersV2?.Listings?.[0]?.Price?.DisplayAmount
               || item?.offersV2?.listings?.[0]?.price?.displayAmount
               || 'N/A';
    const priceAmount = item?.OffersV2?.Listings?.[0]?.Price?.Amount
                     || item?.offersV2?.listings?.[0]?.price?.amount
                     || null;
    const image  = item?.Images?.Primary?.Large?.URL
                || item?.images?.primary?.large?.url
                || null;
    const rating = item?.CustomerReviews?.StarRating?.DisplayValue
                || item?.customerReviews?.starRating?.displayValue
                || null;
    const reviewCount = item?.CustomerReviews?.Count?.DisplayValue
                     || item?.customerReviews?.count?.displayValue
                     || null;

    return {
      asin,
      title,
      brand,
      price,
      priceAmount,
      image,
      rating,
      reviewCount,
      link: `https://www.amazon.com/dp/${asin}?tag=${this.partnerTag}`,
    };
  }

  // ── HTTP helpers ─────────────────────────────────────────────────────────────

  _apiPost(token, path, payload) {
    const body = JSON.stringify(payload);
    return this._post(API_HOST, path, body, {
      'Authorization':    'Bearer ' + token,
      'Content-Type':     'application/json',
      'x-marketplace':    this.marketplace,
    });
  }

  _post(hostname, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const bodyBuf = Buffer.from(body);
      const req = https.request({
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': bodyBuf.length,
          ...extraHeaders,
        },
      }, (res) => {
        let raw = '';
        res.on('data', (c) => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, data: raw }); }
        });
      });
      req.on('error', reject);
      req.write(bodyBuf);
      req.end();
    });
  }
}

module.exports = new CreatorsApiClient();
