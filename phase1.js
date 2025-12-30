const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

const LARAVEL_API = "http://127.0.0.1:8000/api/articles";
const BASE_URL = "https://beyondchats.com/blogs/";

const delay = ms => new Promise(r => setTimeout(r, ms));

/* ===============================
   STEP 1: FIND LAST PAGE NUMBER
================================ */
async function getLastPageNumber() {
  const res = await axios.get(BASE_URL);
  const dom = new JSDOM(res.data);
  const doc = dom.window.document;

  const numbers = [...doc.querySelectorAll(".page-numbers")]
    .map(el => parseInt(el.textContent))
    .filter(Boolean);

  return numbers.length ? Math.max(...numbers) : 1;
}

/* ===============================
   STEP 2: GET LAST 5 OLDEST POSTS
================================ */
async function getLastFiveArticles() {
  const lastPage = await getLastPageNumber();
  console.log("Last page detected:", lastPage);

  let articles = [];
  let page = lastPage;

  while (page >= 1 && articles.length < 5) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
    console.log("Scanning:", url);

    const res = await axios.get(url);
    const dom = new JSDOM(res.data);
    const doc = dom.window.document;

    const links = [...doc.querySelectorAll("article h2 a, article h3 a")]
      .map(a => ({
        title: a.textContent.trim(),
        url: a.href
      }))
      .filter(Boolean);

    for (let i = links.length - 1; i >= 0 && articles.length < 5; i--) {
      articles.unshift(links[i]);
    }

    page--;
  }

  return articles;
}

/* ===============================
   STEP 3: SCRAPE FULL ARTICLE
   (MOZILLA READABILITY)
================================ */
async function scrapeArticle(url) {
  const res = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  const dom = new JSDOM(res.data, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return article?.textContent?.trim() || "";
}

/* ===============================
   MAIN
================================ */
async function phase1() {
  try {
    const articles = await getLastFiveArticles();

    console.log("\nFINAL 5 OLDEST ARTICLES:");
    articles.forEach((a, i) =>
      console.log(`${i + 1}. ${a.title}`)
    );

    for (const art of articles) {
      console.log("\nScraping FULL article:", art.title);

      const content = await scrapeArticle(art.url);
      console.log("Content length:", content.length);

      if (content.length < 1500) {
        console.warn("⚠️ Article too short — skipping");
        continue;
      }

      await axios.post(LARAVEL_API, {
        title: art.title,
        original_content: content,
        original_url: art.url,
        is_updated: false,
        updated_content: null,
        citation_links: null,
        processing_stage: "pending"
      });

      console.log("Inserted ✔");
      await delay(1000);
    }

    console.log("\n✅ PHASE-1 COMPLETED SUCCESSFULLY");

  } catch (err) {
    console.error("❌ Phase-1 error:", err.message);
  }
}

phase1();
