const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

/* ===============================
   CONFIG (UNCHANGED)
================================ */

const ARTICLES_API = "http://127.0.0.1:8000/api/articles";
const SERP_API_KEY = process.env.SERP_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const FORCE_REWRITE = true;
const TOKEN_LIMIT_PER_MINUTE = 6000;

let tokensUsed = 0;
let windowStart = Date.now();

if (!SERP_API_KEY || !GROQ_API_KEY) {
  console.error("❌ Missing SERP_API_KEY or GROQ_API_KEY in .env");
  process.exit(1);
}

/* ===============================
   UTILS (UNCHANGED)
================================ */

const sleep = ms => new Promise(r => setTimeout(r, ms));

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

async function ensureTokenBudget(tokensNeeded) {
  const now = Date.now();
  const elapsed = now - windowStart;

  if (elapsed >= 60_000) {
    tokensUsed = 0;
    windowStart = now;
  }

  if (tokensUsed + tokensNeeded > TOKEN_LIMIT_PER_MINUTE) {
    const waitTime = 60_000 - elapsed + 200;
    console.log(`⏳ Token limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
    await sleep(waitTime);
    tokensUsed = 0;
    windowStart = Date.now();
  }

  tokensUsed += tokensNeeded;
}

/* ===============================
   HELPERS (MOSTLY UNCHANGED)
================================ */

async function fetchArticles() {
  const res = await axios.get(ARTICLES_API);
  return res.data;
}

async function updateArticle(id, payload) {
  await axios.put(`${ARTICLES_API}/${id}`, payload);
}

async function googleSearch(query) {
  try {
    const res = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        num: 5,
        api_key: SERP_API_KEY
      }
    });
    return res.data.organic_results || [];
  } catch (err) {
    console.error("❌ SerpAPI error:", err.message);
    return [];
  }
}

function extractTopBlogs(results) {
  return results
    .filter(r => r.link && !/youtube|reddit|linkedin|facebook|twitter/.test(r.link))
    .slice(0, 2)
    .map(r => r.link);
}

async function scrapeArticle(url) {
  try {
    const res = await axios.get(url, { timeout: 40000 });
    const $ = cheerio.load(res.data);

    let text = "";
    $("p, h2, h3, li").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 40) text += t + "\n\n";
    });

    return text.slice(0, 2500);
  } catch {
    return "";
  }
}

/* ===============================
   GROQ REWRITE (UNCHANGED)
================================ */

async function rewriteWithGroq(original, ref1, ref2) {
  const prompt = `
You are a professional SEO content writer.

Rewrite the article below by:
- Improving structure and clarity
- Enhancing SEO
- Using tone inspired by the reference articles
- Avoiding plagiarism
- Returning clean, well-formatted MARKDOWN
Rules:
- Do NOT shorten the article
- Expand explanations where helpful
- Maintain or exceed the original article length
- Use clear section headings
- Preserve the original intent and depth
Original Article:
${original}

Reference Article 1:
${ref1}

Reference Article 2:
${ref2}
`;

  const estimatedTokens =
    estimateTokens(original) +
    estimateTokens(ref1) +
    estimateTokens(ref2) +
    1200;

  await ensureTokenBudget(estimatedTokens);

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are an expert content editor." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1200
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content;

  } catch (err) {
    console.error("❌ Groq API error:", err.response?.data || err.message);
    throw err; // IMPORTANT → triggers resume later
  }
}

/* ===============================
   MAIN FLOW (RESUMABLE)
================================ */

async function phase2() {
  console.log("Fetching articles...");
  const articles = await fetchArticles();

  for (const article of articles) {
    try {
      const stage = article.processing_stage || "pending";

      if (article.is_updated && !FORCE_REWRITE && stage === "completed") {
        console.log(`Skipping: ${article.title}`);
        continue;
      }

      console.log(`\n▶ Processing: ${article.title} (stage: ${stage})`);

      /* STEP 1: SEARCH */
      if (stage === "pending" || FORCE_REWRITE) {
        const results = await googleSearch(article.title);
        const links = extractTopBlogs(results);

        if (links.length < 2) {
          console.warn("⚠️ Not enough reference articles");
          continue;
        }

        await updateArticle(article.id, {
          citation_links: links,
          processing_stage: "searched"
        });

        article.citation_links = links;
        article.processing_stage = "searched";
      }

      /* STEP 2: SCRAPE */
      if (article.processing_stage === "searched") {
        console.log("Scraping reference articles...");
        const ref1 = await scrapeArticle(article.citation_links[0]);
        const ref2 = await scrapeArticle(article.citation_links[1]);

        await updateArticle(article.id, {
          ref1_content: ref1,
          ref2_content: ref2,
          processing_stage: "scraped"
        });

        article.ref1_content = ref1;
        article.ref2_content = ref2;
        article.processing_stage = "scraped";
      }

      /* STEP 3: REWRITE */
      if (article.processing_stage === "scraped") {
        console.log("Calling Groq...");
        const rewritten = await rewriteWithGroq(
          article.original_content,
          article.ref1_content,
          article.ref2_content
        );

        console.log("Updating article...");
        await updateArticle(article.id, {
          updated_content:
            rewritten +
            "\n\n## References\n" +
            article.citation_links.map(c => `- ${c}`).join("\n"),
          is_updated: true,
          processing_stage: "completed"
        });

        console.log(`✅ Updated: ${article.title}`);
      }

    } catch (err) {
      console.error(`⚠️ Interrupted: ${article.title}`);
      console.error("↻ Will resume on next run");
    }
  }

  console.log("\n🎉 Phase-2 completed (resumable & safe)");
}

phase2().catch(err => {
  console.error("❌ Phase-2 failed:", err.message);
});
