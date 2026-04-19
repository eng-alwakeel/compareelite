# Daily Article Generator — CompareElite

Generate **4 new affiliate articles** for compareelite.com, commit them, and push to `main`.

---

## Step 1 — Pick 4 New Topics

Read all existing slugs from `articles/` directory, then choose **4 topics** from the rotation list below that do NOT already have a file. Pick topics that are diverse (different categories).

### Full Topic Rotation List

```
SLUG                                    | TITLE                                              | CATEGORY      | UNSPLASH_ID
best-gaming-headsets-2026               | Best Gaming Headsets of 2026                       | Technology    | photo-1599861190766-a5563fa716b2
best-mechanical-keyboards-2026          | Best Mechanical Keyboards of 2026                  | Technology    | photo-1587829741301-dc798b83add3
best-ultrawide-monitors-2026            | Best Ultrawide Monitors of 2026                    | Technology    | photo-1527443224154-c4a3942d3acf
best-external-ssds-2026                 | Best External SSDs of 2026                         | Technology    | photo-1531492746076-161ca9bcad58
best-webcams-2026                       | Best Webcams for Streaming & Video Calls 2026      | Technology    | photo-1590602847861-f357a9332bbc
best-usb-c-hubs-2026                    | Best USB-C Hubs & Docking Stations 2026            | Technology    | photo-1518770660439-4636190af475
best-wireless-gaming-mice-2026          | Best Wireless Gaming Mice of 2026                  | Technology    | photo-1615663245857-ac93bb7c39e7
best-smartwatches-2026                  | Best Smartwatches of 2026                          | Technology    | photo-1523275335684-37898b6baf30
best-noise-cancelling-headphones-2026   | Best Noise-Cancelling Headphones of 2026           | Technology    | photo-1505740420928-5e560c06d30e
best-laptop-stands-2026                 | Best Laptop Stands & Risers of 2026                | Technology    | photo-1593642632559-0c6d3fc62b89
best-portable-monitors-2026             | Best Portable Monitors of 2026                     | Technology    | photo-1611532736597-de2d4265fba3
best-smart-displays-2026                | Best Smart Displays of 2026                        | Technology    | photo-1558618666-fcd25c85cd64
best-streaming-sticks-2026              | Best Streaming Sticks & TV Dongles 2026            | Technology    | photo-1522869635100-9f4c5e86aa37
best-gaming-controllers-2026            | Best Gaming Controllers of 2026                    | Technology    | photo-1612287230202-1ff1d85d1bdf
best-action-cameras-2026                | Best Action Cameras of 2026                        | Technology    | photo-1547949003-9792a18a2601
best-drones-2026                        | Best Drones for Beginners & Pros 2026              | Technology    | photo-1507582020474-9a35b7d455d9
best-vr-headsets-2026                   | Best VR Headsets of 2026                           | Technology    | photo-1593508512255-86ab42a8e620
best-home-security-cameras-2026         | Best Home Security Cameras of 2026                 | Technology    | photo-1557597774-9d273605dfa9
best-wifi-routers-2026                  | Best Wi-Fi 6 Routers of 2026                       | Technology    | photo-1544197150-b99a580bb7a8
best-electric-toothbrushes-2026         | Best Electric Toothbrushes of 2026                 | Health        | photo-1609840114035-3c981b782dfe
best-air-fryers-2026                    | Best Air Fryers of 2026                            | Kitchen       | photo-1574269909862-7e1d70bb8078
best-coffee-makers-2026                 | Best Coffee Makers of 2026                         | Kitchen       | photo-1495474472287-4d71bcdd2085
best-instant-pots-2026                  | Best Instant Pots & Pressure Cookers 2026          | Kitchen       | photo-1556909114-f6e7ad7d3136
best-blenders-2026                      | Best Blenders of 2026                              | Kitchen       | photo-1570222094114-d054a817e56b
best-knife-sets-2026                    | Best Kitchen Knife Sets of 2026                    | Kitchen       | photo-1615361200141-f45040f367be
best-stand-mixers-2026                  | Best Stand Mixers of 2026                          | Kitchen       | photo-1556909172-54557c7e4fb7
best-electric-kettles-2026              | Best Electric Kettles of 2026                      | Kitchen       | photo-1544787219-7f47ccb76574
best-food-processors-2026               | Best Food Processors of 2026                       | Kitchen       | photo-1556909048-f918d84ec97e
best-toaster-ovens-2026                 | Best Toaster Ovens & Countertop Ovens 2026         | Kitchen       | photo-1586864387967-d02ef85d93e8
best-espresso-machines-2026             | Best Espresso Machines Under $500 2026             | Kitchen       | photo-1510591509098-f4fdc6d0ff04
best-cast-iron-skillets-2026            | Best Cast Iron Skillets of 2026                    | Kitchen       | photo-1484723091739-30a097e8f929
best-vacuum-sealers-2026                | Best Vacuum Sealers of 2026                        | Kitchen       | photo-1565299507177-b0ac66763828
best-yoga-mats-2026                     | Best Yoga Mats of 2026                             | Fitness       | photo-1544367567-0f2fcb009e0b
best-foam-rollers-2026                  | Best Foam Rollers for Recovery 2026                | Fitness       | photo-1571019614242-c5c5dee9f50b
best-jump-ropes-2026                    | Best Jump Ropes of 2026                            | Fitness       | photo-1598971457999-ca4ef48a9a71
best-pull-up-bars-2026                  | Best Pull-Up Bars for Home 2026                    | Fitness       | photo-1534438327276-14e5300c3a48
best-fitness-trackers-2026              | Best Fitness Trackers of 2026                      | Fitness       | photo-1575311373937-040b8e1fd5b6
best-massage-guns-2026                  | Best Massage Guns of 2026                          | Fitness       | photo-1571019613454-1cb2f99b2d8b
best-protein-shakers-2026               | Best Protein Shakers & Blender Bottles 2026        | Fitness       | photo-1593095948071-474c5cc2989d
best-gym-bags-2026                      | Best Gym Bags of 2026                              | Fitness       | photo-1553062407-98eeb64c6a62
best-treadmills-2026                    | Best Treadmills Under $1000 2026                   | Fitness       | photo-1538805060514-97d9cc17730c
best-stationary-bikes-2026              | Best Stationary Bikes of 2026                      | Fitness       | photo-1534438327276-14e5300c3a48
best-camping-tents-2026                 | Best Camping Tents of 2026                         | Outdoor       | photo-1504280390367-361c6d9f38f4
best-sleeping-bags-2026                 | Best Sleeping Bags of 2026                         | Outdoor       | photo-1445307806294-bff7f67ff225
best-hiking-backpacks-2026              | Best Hiking Backpacks of 2026                      | Outdoor       | photo-1501555088652-021faa106b9b
best-portable-grills-2026               | Best Portable Grills of 2026                       | Outdoor       | photo-1555041469-a586c61ea9bc
best-camp-stoves-2026                   | Best Camp Stoves of 2026                           | Outdoor       | photo-1508193638397-1c4234db14d8
best-headlamps-2026                     | Best Headlamps of 2026                             | Outdoor       | photo-1551632811-561732d1e306
best-sunscreens-2026                    | Best Sunscreens of 2026                            | Health        | photo-1507003211169-0a1dd7228f2d
best-car-vacuums-2026                   | Best Car Vacuums of 2026                           | Automotive    | photo-1558618047-3c8c76ca7d13
best-car-floor-mats-2026                | Best Car Floor Mats of 2026                        | Automotive    | photo-1503376780353-7e6692767b70
best-portable-car-chargers-2026         | Best Portable Car Battery Chargers 2026            | Automotive    | photo-1609592806596-b66b7d72ae9d
best-car-organizers-2026                | Best Car Trunk & Seat Organizers 2026              | Automotive    | photo-1494976388531-d1058494cdd8
best-desk-organizers-2026               | Best Desk Organizers & Storage 2026                | Home          | photo-1593642632559-0c6d3fc62b89
best-led-desk-lamps-2026                | Best LED Desk Lamps of 2026                        | Home          | photo-1507473885765-e6ed057f782c
best-electric-blankets-2026             | Best Electric Blankets of 2026                     | Home          | photo-1555041469-a586c61ea9bc
best-humidifiers-2026                   | Best Humidifiers of 2026                           | Home          | photo-1585771724684-38269d6639fd
best-dehumidifiers-2026                 | Best Dehumidifiers of 2026                         | Home          | photo-1585771724684-38269d6639fd
best-smart-plugs-2026                   | Best Smart Plugs of 2026                           | Technology    | photo-1558618666-fcd25c85cd64
best-solar-chargers-2026                | Best Solar Chargers of 2026                        | Outdoor       | photo-1509391366360-2e959784a276
best-laptop-bags-2026                   | Best Laptop Bags & Backpacks 2026                  | Technology    | photo-1553062407-98eeb64c6a62
best-sunglasses-2026                    | Best Polarized Sunglasses of 2026                  | Fashion       | photo-1508214751196-bcfd4ca60f91
best-beard-trimmers-2026                | Best Beard Trimmers of 2026                        | Health        | photo-1503951914875-452162b0f3f1
best-hair-dryers-2026                   | Best Hair Dryers of 2026                           | Health        | photo-1522338242992-e1a54906a8da
best-electric-shavers-2026              | Best Electric Shavers of 2026                      | Health        | photo-1503951914875-452162b0f3f1
best-luggage-sets-2026                  | Best Luggage Sets of 2026                          | Travel        | photo-1553531889-e6cf4d692b1b
best-travel-pillows-2026                | Best Travel Pillows of 2026                        | Travel        | photo-1436491865332-7a61a109cc05
best-packing-cubes-2026                 | Best Packing Cubes of 2026                         | Travel        | photo-1553531889-e6cf4d692b1b
```

---

## Step 2 — Generate Each Article

For **each of the 4 chosen topics**, generate a complete JSON file following this exact schema. Use your knowledge of real Amazon products with accurate ASINs:

```json
{
  "slug": "best-CATEGORY-2026",
  "title": "Best X of 2026",
  "category": "Technology|Kitchen|Fitness|Outdoor|Health|Automotive|Home|Travel|Fashion",
  "date": "TODAYS_DATE",
  "excerpt": "2-sentence hook that mentions the top use case and what criteria we used.",
  "thumbnail": "https://images.unsplash.com/UNSPLASH_ID?w=800&q=80",
  "author": "CompareElite Team",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "stats": { "readers": 0 },
  "products": [
    {
      "name": "Full Product Name",
      "rating": "9.X/10",
      "price": "$XX",
      "best_for": "Best Overall|Best Value|Best Budget|Best Premium|Most Durable|etc.",
      "link": "https://www.amazon.com/dp/REAL_ASIN?tag=compareelite-20",
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"]
    }
  ],
  "faq": [
    { "q": "Question?", "a": "Answer." },
    { "q": "Question?", "a": "Answer." }
  ]
}
```

**Rules:**
- Include **4 products** per article, sorted highest rating first
- Ratings between `8.0/10` and `9.9/10` — vary them realistically
- Use **real Amazon ASINs** you know from training data; prefer popular well-reviewed products
- `best_for` must be unique per article (no two products share the same badge)
- `pros` = 3 items max, `cons` = 1-2 items max — keep them short (3-5 words each)
- `faq` = exactly 2 questions relevant to the product category
- `excerpt` must be unique and specific to the niche
- Today's date format: `YYYY-MM-DD`

---

## Step 3 — Save Files

Write each article JSON to:
```
/home/user/compareelite/articles/[slug].json
```

---

## Step 4 — Find Amazon Image URLs

After saving all 4 articles, spawn a background agent to find the real Amazon CDN image URLs for each product ASIN. The agent should:

1. For each ASIN, search the web for the image URL pattern `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`
2. Update the JSON files by adding an `"image"` field to each product
3. Save the updated JSON files

If images cannot be found for a product, skip it (the fallback renderer will handle it).

---

## Step 5 — Commit & Push

```bash
git add articles/
git commit -m "Add 4 daily articles: [list slugs]"
git push -u origin main
```

---

## Output

Report back:
- The 4 article slugs generated
- Product count per article
- Whether images were found
- Git push status
