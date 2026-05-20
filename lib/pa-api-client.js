/**
 * pa-api-client.js — Amazon PA-API 5.0 wrapper
 *
 * Requires env vars:
 *   AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY,
 *   AMAZON_PARTNER_TAG, AMAZON_REGION (default: us-east-1)
 */

const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

class AmazonPAAPIClient {
  constructor() {
    const region = process.env.AMAZON_REGION || 'us-east-1';

    const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
    defaultClient.accessKey = process.env.AMAZON_ACCESS_KEY;
    defaultClient.secretKey = process.env.AMAZON_SECRET_KEY;
    defaultClient.host = region === 'us-east-1'
      ? 'webservices.amazon.com'
      : `webservices.amazon.${region.split('-').pop()}`;
    defaultClient.region = region;

    this.api        = new ProductAdvertisingAPIv1.DefaultApi();
    this.partnerTag = process.env.AMAZON_PARTNER_TAG || 'compareelite-20';
  }

  searchProducts(keywords, searchIndex = 'All', count = 6) {
    return new Promise((resolve, reject) => {
      const req = new ProductAdvertisingAPIv1.SearchItemsRequest();
      req.PartnerTag  = this.partnerTag;
      req.PartnerType = 'Associates';
      req.Keywords    = keywords;
      req.SearchIndex = searchIndex;
      req.ItemCount   = count;
      req.Resources   = [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'Offers.Listings.Price',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
      ];

      this.api.searchItems(req, (error, data) => {
        if (error) return reject(error);
        const items = data?.SearchResult?.Items || [];
        resolve(items.map((item) => this._format(item)));
      });
    });
  }

  getProductDetails(asin) {
    return new Promise((resolve, reject) => {
      const req = new ProductAdvertisingAPIv1.GetItemsRequest();
      req.PartnerTag  = this.partnerTag;
      req.PartnerType = 'Associates';
      req.ItemIds     = [asin];
      req.Resources   = [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'Offers.Listings.Price',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
      ];

      this.api.getItems(req, (error, data) => {
        if (error) return reject(error);
        const item = data?.ItemsResult?.Items?.[0];
        resolve(item ? this._format(item) : null);
      });
    });
  }

  _format(item) {
    return {
      asin:        item.ASIN,
      title:       item.ItemInfo?.Title?.DisplayValue       || '',
      brand:       item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '',
      price:       item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A',
      priceAmount: item.Offers?.Listings?.[0]?.Price?.Amount || null,
      image:       item.Images?.Primary?.Large?.URL         || null,
      rating:      item.CustomerReviews?.StarRating?.DisplayValue  || null,
      reviewCount: item.CustomerReviews?.Count?.DisplayValue       || null,
      link:        `https://www.amazon.com/dp/${item.ASIN}?tag=${this.partnerTag}`,
    };
  }
}

module.exports = new AmazonPAAPIClient();
