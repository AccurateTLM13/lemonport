# Episode 001 — Product link mapping (ASINs)

Researched 2026-10-09. Every link in `rankings/house-shoe-matrix/index.html`
carries `rel="sponsored nofollow noopener"`. Amazon links use the
`lemonteed-20` Associates tag. Brand-direct links carry no tag (Amazon tag is
Amazon-only) and earn no commission — they are honest buy-links.

**Verification method:** Amazon serves HTTP 403 to text-fetch tools, so no
Amazon product page could be opened directly in most cases. ASINs were
extracted verbatim from Amazon's own product-page data captured in search
results (title, brand/manufacturer, model number, ASIN fields) and
cross-checked across multiple result variants. Nothing was invented. A live
spot-check of 2–3 links in a real browser before publishing is cheap insurance.

## Amazon listings (18)

| Product (as named in article) | ASIN | Link | Verification notes |
|---|---|---|---|
| UGG Coquette | B0009F6RTO | https://www.amazon.com/dp/B0009F6RTO-lemonteed-20 | 6+ result variants, all "UGG Women's Coquette Slipper", UGG Store, model 5125 |
| UGG Tasman | B0D538HPT6 | https://www.amazon.com/dp/B0D538HPT6-lemonteed-20 | "UGG Women's Tasman Slipper", UGG Store, model 5955 (classic Tasman, not Tasman II) |
| UGG Fluff Yeah Slide | B08HTKR115 | https://www.amazon.com/dp/B08HTKR115-lemonteed-20 | "UGG Women's Fluff Yeah Slide Slipper", UGG Store, model 1095119 |
| Koolaburra by UGG (Fuzz'n II) | B08911RRQR | https://www.amazon.com/dp/B08911RRQR-lemonteed-20 | Koolaburra by UGG Women's Fuzz'n II, model 1116914, MSRP $59.95 — from Amazon-mirrored listing data; high confidence, not directly page-verified |
| Minnetonka Moccasin (Cally) | B06Y17M2QR | https://www.amazon.com/dp/B06Y17M2QR-lemonteed-20 | "Minnetonka Womens Cally Moccasin Slipper", Manufacturer: Minnetonka. Caveat: Minnetonka has several moccasin lines; Cally is the iconic best-seller |
| Steve Madden faux-fur mule | B0D98P5X8G | https://www.amazon.com/dp/B0D98P5X8G-lemonteed-20 | Page opened live: "Steve Madden Women's Slip", style SLIP04S1, official Steve Madden Store. Note: checked color variant showed "currently unavailable" — link resolves to available variants |
| Muk Luks cabin slipper socks | B0CD31J1SV | https://www.amazon.com/dp/B0CD31J1SV-lemonteed-20 | "MUK LUKS Women's Cozy Sherpa Lined Cabin Sock (2 Pair Pack)" — extracted from Amazon-mirror URL; lower confidence, worth a live check |
| Isotoner Classic Terry Ballerina | B01M24S9OF | https://www.amazon.com/dp/B01M24S9OF-lemonteed-20 | isotoner Store: "Isotoner Women's Classic Terry Ballerina Slipper", confirmed in two crawls |
| RockDove Hearthfire Memory Foam Moc | B08VHX285V | https://www.amazon.com/dp/B08VHX285V-lemonteed-20 | "RockDove Men's Hearthfire Memory Foam Moc Slipper", RockDove Store, $24.22 |
| Dearfoams Brendan | B07W5JQW16 | https://www.amazon.com/dp/B07W5JQW16-lemonteed-20 | Page opened live; manufacturer section names "Men's Brendan Clog", seller R.G. Barry (Dearfoams parent). Note: Dearfoams markets it as a **clog** — article copy corrected accordingly |
| Skechers Cozy Campfire | B08ZL246FD | https://www.amazon.com/dp/B08ZL246FD-lemonteed-20 | "Skechers Women's Cozy Campfire-Fresh Toast Slipper", Skechers Store, model 167219-CSNT |
| Acorn Faux Chinchilla Bootie | B002N5QIBU | https://www.amazon.com/dp/B002N5QIBU-lemonteed-20 | Page opened live: "Acorn Women's Chinchilla Bootie Slipper", brand Acorn |
| Fireside by Dearfoams Sydney Scuff | B095PWMLYC | https://www.amazon.com/dp/B095PWMLYC-lemonteed-20 | "Dearfoams Women's Fireside Sydney Shearling Fur Scuff", Fireside by Dearfoams Store, #20 in Women's Slippers |
| Sorel Nakiska Bootie | B07KJZJVTR | https://www.amazon.com/dp/B07KJZJVTR-lemonteed-20 | "SOREL Women's Nakiska Bootie", Sorel Store, model 1876141 — confirmed across seven crawls |
| Haflinger GZ Classic Grizzly | B001C11XT8 | https://www.amazon.com/dp/B001C11XT8-lemonteed-20 | "HAFLINGER Men's Gz Classic Grizzly Slippers" — the boiled-wool classic |
| Giesswein Veitsch Lodge Slipper | B00264G0KC | https://www.amazon.com/dp/B00264G0KC-lemonteed-20 | "Giesswein Unisex Veitsch Lodge Slipper" — Austrian boiled wool line |
| OluKai Moloa | B0CQMZVWW8 | https://www.amazon.com/dp/B0CQMZVWW8-lemonteed-20 | "OLUKAI Moloa Slipper", OLUKAI Store, model 10252, #33 in Men's Slippers |
| Birkenstock Zermatt Shearling | B08G8WQ25K | https://www.amazon.com/dp/B08G8WQ25K-lemonteed-20 | "BIRKENSTOCK Zermatt Shearling", model 1017544 (wool-felt + shearling lining) |

## Brand-direct links (6 — no Amazon listing exists, no commission)

| Product | URL |
|---|---|
| The Row Hudson Slide | https://www.therow.com/products/hudson-slide-black |
| Rothy's The Teddy Slipper | https://rothys.com/products/womens-teddy-slipper-oat-milk |
| Bombas Sunday Slipper | https://bombas.com/products/womens-sunday-slippers |
| Lands' End Fuzzy Lined Suede Moccasin Slippers | https://www.landsend.com/products/womens-fuzzy-lined-suede-moccasin-slippers/id_387721 |
| L.L.Bean Wicked Good | https://www.llbean.com/llb/shop/517001?page=wicked-good-slippers |
| L.L.Bean Wicked Good Camp Moccasin | https://www.llbean.com/llb/shop/517001?page=wicked-good-slippers |

Notes:
- L.L.Bean sells direct-only; no L.L.Bean products exist on Amazon.
- The Row, Rothy's, Bombas, and Lands' End do not retail these products on Amazon (confirmed via site-scoped searches).
- If any Amazon link 404s later (listings get merged/retired), re-search the model name on Amazon and swap the ASIN — the `-lemonteed-20` suffix format stays the same.
