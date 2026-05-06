/**
 * Tests for Amazon link validation logic
 * Tests ASIN extraction, format validation, and link structure
 */

const ASIN_RE = /\/dp\/([A-Z0-9]{10})/;
const AFFILIATE_TAG = 'compareelite-20';

function isAsinFormatValid(asin) {
  return typeof asin === 'string' && /^[A-Z0-9]{10}$/.test(asin);
}

function extractAsin(link) {
  const match = link.match(ASIN_RE);
  return match ? match[1] : null;
}

function hasCorrectAffiliateTag(link) {
  return link.includes(`tag=${AFFILIATE_TAG}`);
}

function isValidAmazonLink(link) {
  if (typeof link !== 'string') return false;
  if (!link.includes('amazon.com')) return false;

  const asin = extractAsin(link);
  if (!asin || !isAsinFormatValid(asin)) return false;

  return hasCorrectAffiliateTag(link);
}

describe('Amazon Link Validation', () => {
  describe('isAsinFormatValid', () => {
    it('should return true for valid ASINs', () => {
      expect(isAsinFormatValid('B08X1234AB')).toBe(true);
      expect(isAsinFormatValid('A123456789')).toBe(true);
      expect(isAsinFormatValid('0123456789')).toBe(true);
    });

    it('should return false for invalid ASINs', () => {
      expect(isAsinFormatValid('B08X123')).toBe(false); // Too short
      expect(isAsinFormatValid('B08X1234ABC')).toBe(false); // Too long
      expect(isAsinFormatValid('b08x1234ab')).toBe(false); // Lowercase
      expect(isAsinFormatValid('B08X-123AB')).toBe(false); // Contains hyphen
      expect(isAsinFormatValid('')).toBe(false);
      expect(isAsinFormatValid(null)).toBe(false);
    });
  });

  describe('extractAsin', () => {
    it('should extract ASIN from valid Amazon links', () => {
      expect(extractAsin('https://amazon.com/dp/B08X1234AB')).toBe('B08X1234AB');
      expect(extractAsin('https://amazon.com/dp/B08X1234AB?tag=compareelite-20')).toBe('B08X1234AB');
      expect(extractAsin('https://www.amazon.com/product-name/dp/B08X1234AB/ref=abc')).toBe('B08X1234AB');
    });

    it('should return null for links without valid ASIN', () => {
      expect(extractAsin('https://amazon.com')).toBeNull();
      expect(extractAsin('https://amazon.com/search?q=test')).toBeNull();
      expect(extractAsin('https://example.com')).toBeNull();
    });
  });

  describe('hasCorrectAffiliateTag', () => {
    it('should return true for links with correct affiliate tag', () => {
      expect(hasCorrectAffiliateTag('https://amazon.com/dp/B08X1234AB?tag=compareelite-20')).toBe(true);
      expect(hasCorrectAffiliateTag('https://amazon.com/dp/B08X1234AB?foo=bar&tag=compareelite-20')).toBe(true);
    });

    it('should return false for links without affiliate tag', () => {
      expect(hasCorrectAffiliateTag('https://amazon.com/dp/B08X1234AB')).toBe(false);
      expect(hasCorrectAffiliateTag('https://amazon.com/dp/B08X1234AB?tag=wrongtag-20')).toBe(false);
    });
  });

  describe('isValidAmazonLink', () => {
    it('should return true for valid Amazon affiliate links', () => {
      expect(isValidAmazonLink('https://amazon.com/dp/B08X1234AB?tag=compareelite-20')).toBe(true);
      expect(isValidAmazonLink('https://www.amazon.com/product/dp/A123456789?tag=compareelite-20')).toBe(true);
    });

    it('should return false for links without amazon.com domain', () => {
      expect(isValidAmazonLink('https://example.com/dp/B08X1234AB?tag=compareelite-20')).toBe(false);
    });

    it('should return false for Amazon links without ASIN', () => {
      expect(isValidAmazonLink('https://amazon.com?tag=compareelite-20')).toBe(false);
      expect(isValidAmazonLink('https://amazon.com/search?q=test')).toBe(false);
    });

    it('should return false for Amazon links without affiliate tag', () => {
      expect(isValidAmazonLink('https://amazon.com/dp/B08X1234AB')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(isValidAmazonLink(null)).toBe(false);
      expect(isValidAmazonLink(undefined)).toBe(false);
      expect(isValidAmazonLink(123)).toBe(false);
    });
  });

  describe('Product Link Validation', () => {
    it('should validate all products have valid Amazon links', () => {
      const products = [
        {
          name: 'Product 1',
          link: 'https://amazon.com/dp/B08X1234AB?tag=compareelite-20',
        },
        {
          name: 'Product 2',
          link: 'https://amazon.com/dp/C09Y5678CD?tag=compareelite-20',
        },
      ];

      const invalidProducts = products.filter(p => !isValidAmazonLink(p.link));
      expect(invalidProducts).toHaveLength(0);
    });

    it('should detect products with invalid links', () => {
      const products = [
        {
          name: 'Valid Product',
          link: 'https://amazon.com/dp/B08X1234AB?tag=compareelite-20',
        },
        {
          name: 'Missing Tag',
          link: 'https://amazon.com/dp/B08X1234AB',
        },
        {
          name: 'Wrong Tag',
          link: 'https://amazon.com/dp/B08X1234AB?tag=wrongtag-20',
        },
      ];

      const invalidProducts = products.filter(p => !isValidAmazonLink(p.link));
      expect(invalidProducts).toHaveLength(2);
      expect(invalidProducts.map(p => p.name)).toContain('Missing Tag');
      expect(invalidProducts.map(p => p.name)).toContain('Wrong Tag');
    });
  });

  describe('ASIN Extraction from Article', () => {
    it('should extract all ASINs from article products', () => {
      const article = {
        products: [
          { link: 'https://amazon.com/dp/B08X1234AB?tag=compareelite-20' },
          { link: 'https://amazon.com/dp/C09Y5678CD?tag=compareelite-20' },
          { link: 'https://amazon.com/dp/D10Z9012EF?tag=compareelite-20' },
        ],
      };

      const asins = article.products
        .map(p => extractAsin(p.link))
        .filter(Boolean);

      expect(asins).toHaveLength(3);
      expect(asins).toContain('B08X1234AB');
      expect(asins).toContain('C09Y5678CD');
      expect(asins).toContain('D10Z9012EF');
    });

    it('should handle products with missing or invalid links', () => {
      const article = {
        products: [
          { link: 'https://amazon.com/dp/B08X1234AB?tag=compareelite-20' },
          { link: 'invalid' },
          {},
          { link: 'https://amazon.com/dp/C09Y5678CD?tag=compareelite-20' },
        ],
      };

      const asins = article.products
        .map(p => extractAsin(p.link || ''))
        .filter(Boolean);

      expect(asins).toHaveLength(2);
      expect(asins).toContain('B08X1234AB');
      expect(asins).toContain('C09Y5678CD');
    });
  });
});
