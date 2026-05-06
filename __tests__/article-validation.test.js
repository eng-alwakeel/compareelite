/**
 * Tests for article validation logic
 * Tests the core validation rules without running the full CLI script
 */

const VALID_CATEGORIES = ['Tech', 'Home Office', 'Smart Home', 'Home Fitness'];
const AMAZON_CDN_PREFIX = 'https://m.media-amazon.com/images/I/';
const MIN_PRODUCTS = 6;

// Extracted validation functions for testing
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isHttpUrl(v) {
  return isNonEmptyString(v) && /^https?:\/\/\S+$/i.test(v.trim());
}

function isAmazonCdnImage(url) {
  return url.startsWith(AMAZON_CDN_PREFIX) || url.startsWith('https://images-na.ssl-images-amazon.com/images/');
}

function validateRequiredFields(article) {
  const required = ['title', 'slug', 'category', 'date', 'thumbnail', 'excerpt', 'products', 'buying_guide', 'faq', 'related_articles'];
  const errors = [];

  for (const field of required) {
    if (!(field in article)) {
      errors.push(`missing required field: ${field}`);
    }
  }

  return errors;
}

function validateStringFields(article) {
  const errors = [];
  const stringFields = ['title', 'slug', 'category', 'date', 'thumbnail', 'excerpt'];

  for (const field of stringFields) {
    if (field in article && !isNonEmptyString(article[field])) {
      errors.push(`field "${field}" must be a non-empty string`);
    }
  }

  return errors;
}

function validateCategory(category) {
  if (category && !VALID_CATEGORIES.includes(category)) {
    return [`category "${category}" is not one of: ${VALID_CATEGORIES.join(', ')}`];
  }
  return [];
}

function validateThumbnail(article) {
  const errors = [];

  if (article.thumbnail) {
    if (!isHttpUrl(article.thumbnail)) {
      errors.push('thumbnail must be a valid http(s) image URL');
    } else if (!isAmazonCdnImage(article.thumbnail)) {
      errors.push('thumbnail must be an Amazon CDN URL');
    } else if (
      Array.isArray(article.products) &&
      article.products[0] &&
      article.products[0].image &&
      article.thumbnail !== article.products[0].image
    ) {
      errors.push('thumbnail must equal products[0].image (the Best Overall product)');
    }
  }

  return errors;
}

function validateExcerpt(excerpt) {
  const errors = [];

  if (typeof excerpt === 'string') {
    const len = excerpt.length;
    if (len < 140 || len > 170) {
      errors.push(`excerpt must be 140–170 characters (found ${len})`);
    }
  }

  return errors;
}

function validateProducts(products) {
  const errors = [];

  if (!Array.isArray(products)) {
    errors.push('products must be an array');
  } else if (products.length < MIN_PRODUCTS) {
    errors.push(`products must have at least ${MIN_PRODUCTS} items (found ${products.length})`);
  }

  return errors;
}

describe('Article Validation', () => {
  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  test  ')).toBe(true);
    });

    it('should return false for empty or non-string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isHttpUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isHttpUrl('https://example.com')).toBe(true);
      expect(isHttpUrl('http://example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isHttpUrl('not a url')).toBe(false);
      expect(isHttpUrl('')).toBe(false);
      expect(isHttpUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass for article with all required fields', () => {
      const article = {
        title: 'Test',
        slug: 'test',
        category: 'Tech',
        date: '2026-05-01',
        thumbnail: 'https://example.com/img.jpg',
        excerpt: 'Test excerpt',
        products: [],
        buying_guide: {},
        faq: [],
        related_articles: [],
      };

      const errors = validateRequiredFields(article);
      expect(errors).toHaveLength(0);
    });

    it('should fail for missing required fields', () => {
      const article = {
        title: 'Test',
        slug: 'test',
      };

      const errors = validateRequiredFields(article);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('missing required field: category');
      expect(errors).toContain('missing required field: products');
    });
  });

  describe('validateStringFields', () => {
    it('should pass for valid string fields', () => {
      const article = {
        title: 'Valid Title',
        slug: 'valid-slug',
        category: 'Tech',
        date: '2026-05-01',
        thumbnail: 'https://example.com/img.jpg',
        excerpt: 'Valid excerpt',
      };

      const errors = validateStringFields(article);
      expect(errors).toHaveLength(0);
    });

    it('should fail for empty string fields', () => {
      const article = {
        title: '',
        slug: '   ',
      };

      const errors = validateStringFields(article);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCategory', () => {
    it('should pass for valid categories', () => {
      expect(validateCategory('Tech')).toHaveLength(0);
      expect(validateCategory('Home Office')).toHaveLength(0);
      expect(validateCategory('Smart Home')).toHaveLength(0);
      expect(validateCategory('Home Fitness')).toHaveLength(0);
    });

    it('should fail for invalid category', () => {
      const errors = validateCategory('Invalid Category');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('not one of');
    });
  });

  describe('validateThumbnail', () => {
    it('should pass for valid Amazon CDN thumbnail matching first product', () => {
      const article = {
        thumbnail: 'https://m.media-amazon.com/images/I/test.jpg',
        products: [
          {
            image: 'https://m.media-amazon.com/images/I/test.jpg',
          },
        ],
      };

      const errors = validateThumbnail(article);
      expect(errors).toHaveLength(0);
    });

    it('should fail for non-Amazon CDN thumbnail', () => {
      const article = {
        thumbnail: 'https://example.com/image.jpg',
      };

      const errors = validateThumbnail(article);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Amazon CDN URL');
    });

    it('should fail if thumbnail does not match first product image', () => {
      const article = {
        thumbnail: 'https://m.media-amazon.com/images/I/test1.jpg',
        products: [
          {
            image: 'https://m.media-amazon.com/images/I/test2.jpg',
          },
        ],
      };

      const errors = validateThumbnail(article);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('must equal products[0].image');
    });
  });

  describe('validateExcerpt', () => {
    it('should pass for excerpt with 140-170 characters', () => {
      const validExcerpt = 'A'.repeat(150); // 150 characters
      const errors = validateExcerpt(validExcerpt);
      expect(errors).toHaveLength(0);
    });

    it('should fail for excerpt too short', () => {
      const shortExcerpt = 'A'.repeat(100); // 100 characters
      const errors = validateExcerpt(shortExcerpt);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('140–170 characters');
    });

    it('should fail for excerpt too long', () => {
      const longExcerpt = 'A'.repeat(200); // 200 characters
      const errors = validateExcerpt(longExcerpt);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('140–170 characters');
    });
  });

  describe('validateProducts', () => {
    it('should pass for products array with 6+ items', () => {
      const products = new Array(6).fill({ name: 'Test Product' });
      const errors = validateProducts(products);
      expect(errors).toHaveLength(0);
    });

    it('should fail for products array with less than 6 items', () => {
      const products = new Array(3).fill({ name: 'Test Product' });
      const errors = validateProducts(products);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('at least 6 items');
    });

    it('should fail if products is not an array', () => {
      const errors = validateProducts('not an array');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBe('products must be an array');
    });
  });

  describe('Complete Article Validation', () => {
    it('should validate a complete valid article', () => {
      const validArticle = {
        title: 'Best Air Fryers of 2026',
        slug: 'best-air-fryers-2026',
        category: 'Smart Home',
        date: '2026-05-01',
        thumbnail: 'https://m.media-amazon.com/images/I/test.jpg',
        excerpt: 'A'.repeat(150), // Valid 150 character excerpt
        products: new Array(6).fill({
          image: 'https://m.media-amazon.com/images/I/test.jpg',
          name: 'Test Product',
        }),
        buying_guide: { title: 'Guide', body: 'Content' },
        faq: [{ q: 'Question?', a: 'Answer.' }],
        related_articles: [],
      };

      validArticle.products[0].image = validArticle.thumbnail;

      const allErrors = [
        ...validateRequiredFields(validArticle),
        ...validateStringFields(validArticle),
        ...validateCategory(validArticle.category),
        ...validateThumbnail(validArticle),
        ...validateExcerpt(validArticle.excerpt),
        ...validateProducts(validArticle.products),
      ];

      expect(allErrors).toHaveLength(0);
    });
  });
});
