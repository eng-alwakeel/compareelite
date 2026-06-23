#!/usr/bin/env node
'use strict';
// Throwaway in-stock prober. Fetch /dp/<ASIN> with rotating UAs + retries,
// decompress gzip/br, classify CAPTCHA / OOS / IN_STOCK, extract main I/ image.
const https = require('https');
const zlib = require('zlib');

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(asin, ua) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'www.amazon.com',
        path: `/dp/${asin}`,
        method: 'GET',
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
        timeout: 20000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          let buf = Buffer.concat(chunks);
          const enc = (res.headers['content-encoding'] || '').toLowerCase();
          try {
            if (enc === 'gzip') buf = zlib.gunzipSync(buf);
            else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
            else if (enc === 'deflate') buf = zlib.inflateSync(buf);
          } catch (e) {}
          resolve({ status: res.statusCode, body: buf.toString('utf8'), len: buf.length });
        });
      }
    );
    req.on('error', () => resolve({ status: 0, body: '', len: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', len: 0 }); });
    req.end();
  });
}

function classify(html) {
  const captcha = /Robot Check|validateCaptcha|opfcaptcha|Enter the characters you see below|To discuss automated access/i.test(html);
  // Pre-order / future-release listings are NOT buyable today even though they
  // render no id="outOfStock" box. Detect a release-date / pre-order availability state.
  let preorder = false;
  const availIdx = html.indexOf('id="availability"');
  if (availIdx !== -1) {
    const ab = html.slice(availIdx, availIdx + 600).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (/This item will be released on|Pre-order now|Available for Pre-order|Releases on/i.test(ab)) preorder = true;
  }
  if (/This item will be released on|Pre-order now\.|Available for Pre-order/i.test(html)) preorder = true;
  // Distinguish a genuine stock-out from a France geo shipping restriction.
  let oosReason = null;
  const oosIdx = html.indexOf('id="outOfStock"');
  if (oosIdx !== -1) {
    const box = html.slice(oosIdx, oosIdx + 600).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (/We don't know when or if this item will be back|Currently unavailable\./i.test(box)) oosReason = 'GENUINE_OOS';
    else if (/cannot be shipped to your selected delivery location/i.test(box)) oosReason = 'GEO_BLOCK';
    else oosReason = 'OTHER_BOX';
  }
  const oos = oosReason === 'GENUINE_OOS';
  const atc = /id="add-to-cart-button"/i.test(html);
  const titleM = html.match(/id="productTitle"[^>]*>([^<]+)</);
  const priceM = html.match(/class="a-offscreen">(\$[0-9,]+\.\d{2})</);
  const ratingM = html.match(/([0-9.]+) out of 5 stars/);
  const imgM = html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/) ||
               html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/) ||
               html.match(/data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
  return {
    captcha, oos, atc, oosReason, preorder,
    title: titleM ? titleM[1].trim() : null,
    price: priceM ? priceM[1] : null,
    rating: ratingM ? ratingM[1] : null,
    image: imgM ? imgM[1] : null,
  };
}

(async () => {
  const asins = process.argv.slice(2);
  for (const asin of asins) {
    let result = null;
    for (let i = 0; i < 14; i++) {
      const ua = UAS[i % UAS.length];
      const r = await get(asin, ua);
      const c = classify(r.body);
      if (r.status === 404 || r.status === 410) { result = { verdict: 'DEAD', ...r, ...c, attempt: i + 1 }; break; }
      if (!c.captcha && r.len > 200000) {
        let v;
        if (c.preorder) v = 'PREORDER(not-buyable)';
        else if (c.oosReason === 'GENUINE_OOS') v = 'GENUINE_OOS';
        else if (c.atc) v = 'IN_STOCK';
        else if (c.oosReason === 'GEO_BLOCK') v = 'GEO_BLOCK(US-instock,no-ATC)';
        else v = 'NO_BUYBOX';
        result = { verdict: v, ...r, ...c, attempt: i + 1 }; break;
      }
      await sleep(1500 + Math.floor(Math.random() * 1500));
    }
    if (!result) result = { verdict: 'CAPTCHA_WALL', attempt: 14 };
    console.log(`\n=== ${asin} ===`);
    console.log(`verdict: ${result.verdict}  (attempt ${result.attempt}, status ${result.status || '-'}, len ${result.len || '-'})`);
    console.log(`title:  ${result.title || '-'}`);
    console.log(`price:  ${result.price || '-'}   rating: ${result.rating || '-'}`);
    console.log(`atc: ${result.atc}  oosReason: ${result.oosReason || '-'}  preorder: ${result.preorder || false}`);
    console.log(`image:  ${result.image || '-'}`);
  }
})();
