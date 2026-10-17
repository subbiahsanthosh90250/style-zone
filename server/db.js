const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// DATA_DIR lets a single persistent disk (e.g. on Render) cover both the
// database and uploaded images. Locally it defaults to a folder in the repo.
const dataDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'db')
  : path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'style-zone.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    badge TEXT,
    category TEXT NOT NULL,
    description TEXT,
    fit TEXT,
    fabric TEXT,
    availability TEXT,
    images TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate old space-separated category strings (e.g. "mens kids") to JSON
// label arrays (e.g. ["Men's","Kid's"]) so categories can be free-text and
// dynamic going forward. Idempotent: rows already storing a JSON array are left alone.
const LEGACY_LABELS = { mens: "Men's", kids: "Kid's", graphic: 'Graphic' };
function migrateCategoriesToJsonArrays() {
  const rows = db.prepare('SELECT id, category FROM items').all();
  const update = db.prepare('UPDATE items SET category = ? WHERE id = ?');
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.category);
      if (Array.isArray(parsed)) continue; // already migrated
    } catch {
      // not JSON — legacy space-separated format, fall through to convert
    }
    const labels = row.category
      .split(/\s+/)
      .filter(Boolean)
      .map((slug) => LEGACY_LABELS[slug] || slug.charAt(0).toUpperCase() + slug.slice(1));
    update.run(JSON.stringify(labels), row.id);
  }
}
migrateCategoriesToJsonArrays();

// Seed the existing showcase catalog on first run so the live site isn't blank.
const SEED_ITEMS = [
  {
    id: 'sz-1',
    title: 'STYLE ZONE Classic Drop-Shoulder T-Shirt — White',
    badge: "Men's & Youth Essential",
    category: ["Men's", "Kid's"],
    description:
      'Crafted from breathable heavy-gauge combed cotton with a relaxed drop-shoulder silhouette. Designed for effortless everyday wear with clean minimalist lines.',
    fit: 'Relaxed Drop-Shoulder Fit (Men & Youth Sizes)',
    fabric: '100% Premium Combed Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p1-1.webp', 'assets/p1-2.webp', 'assets/p1-3.webp'],
  },
  {
    id: 'sz-2',
    title: 'STYLE ZONE Classic Drop-Shoulder T-shirt — White',
    badge: 'Statement Back Print',
    category: ["Men's", "Kid's", 'Graphic'],
    description:
      'A signature white drop-shoulder tee featuring high-definition back artwork and a structured ribbed crew neck that holds its shape wash after wash.',
    fit: 'Oversized Streetwear Fit',
    fabric: 'Heavyweight Bio-Washed Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p2-1.webp', 'assets/p2-2.webp'],
  },
  {
    id: 'sz-3',
    title: 'STYLE ZONE Focus Graphic Tee — Black',
    badge: 'Graphic Series',
    category: ["Men's", 'Graphic'],
    description:
      'Bold typographic and visual focus artwork printed on deep jet-black fabric. Built for sharp contrast and standout street presence.',
    fit: 'Boxy Streetwear Cut',
    fabric: 'Premium French Terry Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p3-1.webp', 'assets/p3-2.webp'],
  },
  {
    id: 'sz-4',
    title: 'STYLE ZONE Signature Oversized Tee – Midnight Black',
    badge: 'Signature Oversized Fit',
    category: ["Men's", "Kid's"],
    description:
      'Our staple midnight black oversized tee featuring subtle tonal detailing and ultra-soft fabric drape for all-day comfort.',
    fit: 'Unisex / Men & Youth Oversized',
    fabric: '100% Ring-Spun Super Combed Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p4-1.webp', 'assets/p4-2.webp', 'assets/p4-3.webp'],
  },
  {
    id: 'sz-5',
    title: 'STYLE ZONE Signature Oversized Tee – Pure White',
    badge: "Kid's & Men's Fit",
    category: ["Kid's", "Men's"],
    description:
      'Crisp optical white oversized tee tailored for both youth and adult silhouettes. Minimalist front profile paired with signature back graphics.',
    fit: "Kid's, Youth & Men's Sizes Available",
    fabric: 'Breathable Luxury Jersey Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p5-1.webp', 'assets/p5-2.webp', 'assets/p5-3.webp'],
  },
  {
    id: 'sz-6',
    title: 'STYLE ZONE Unholy Graphic Tee — Black',
    badge: 'Limited Graphic Edition',
    category: ["Men's", 'Graphic'],
    description:
      'Distinctive custom illustration merged with vintage-washed black cotton. A centerpiece garment from the Style Zone seasonal lookbook.',
    fit: 'Drop-Shoulder Oversized Fit',
    fabric: 'Heavyweight Luxury Cotton',
    availability: 'In-Store Showcase — Villianur Showroom',
    images: ['assets/p6-1.webp', 'assets/p6-2.webp'],
  },
];

const itemCount = db.prepare('SELECT COUNT(*) AS count FROM items').get().count;
if (itemCount === 0) {
  const insertSeed = db.prepare(`
    INSERT INTO items (id, title, badge, category, description, fit, fabric, availability, images)
    VALUES (@id, @title, @badge, @category, @description, @fit, @fabric, @availability, @images)
  `);
  db.exec('BEGIN');
  try {
    for (const item of SEED_ITEMS) {
      insertSeed.run({ ...item, category: JSON.stringify(item.category), images: JSON.stringify(item.images) });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
