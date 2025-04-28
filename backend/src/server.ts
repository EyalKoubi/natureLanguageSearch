import express, { Request, Response } from "express";
import cors from "cors";
import algoliasearch from "algoliasearch";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const APP_ID = process.env.ALGOLIA_APP_ID!;
const API_KEY = process.env.ALGOLIA_SEARCH_KEY!;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

interface Product {
  objectID: string;
  title: string;
  image: string;
  link: string;
  stars: number;
  reviews: number;
  price: number;
  isBestSeller: boolean;
  category: string;
}

const client = algoliasearch(APP_ID, API_KEY);
const index = client.initIndex(INDEX_NAME);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!q || q.trim().length < 2) {
      const result = await index.search("", {
        page,
        hitsPerPage: limit,
      });

      return res.json({
        hits: result.hits,
        nbHits: result.nbHits,
        page: result.page,
        nbPages: result.nbPages,
      });
    }

    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are a smart assistant for an E-Commerce platform.  
Products are stored in English.  
Users submit search queries in either Hebrew or English, using free natural language.

Instructions:
- First, if the query is in Hebrew, translate it accurately into English.
- After translation (if needed), analyze and extract:
  - "keywords": a list of 2–5 broad and meaningful English keywords for search.
  - "filters": an object with possible search filters (minPrice, maxPrice, minStars, categories).

Important:
- If the query includes multiple details, focus on extracting only the **main essential concepts** that most help to find products.
- Be **creative and flexible**: if exact words don't make sense for search, generalize to broader categories (e.g., "smart devices", "home gadgets", "outdoor furniture").
- Prefer **well-known search terms** over too-specific or uncommon ones.
- Return **always valid JSON**, with no extra explanations.

Example:

Input: "גאדג'טים לבית חכם תואמי אלקסה עם דירוג מעל 4 כוכבים"
Output:
{
  "keywords": ["smart home gadgets", "Alexa compatible"],
  "filters": {
    "minStars": 4
  }
}

Input: "מיטה זוגית מתקפלת עם מקום לאחסון"
Output:
{
  "keywords": ["foldable bed", "storage bed"],
  "filters": {}
}

Even if input is complex or ambiguous, you must extract **usable** and **broad** keywords for product search.
`,
          },
          {
            role: "user",
            content: q,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    let keywords = q;
    let filters: any = {};

    try {
      const parsed = JSON.parse(
        groqResponse.data.choices?.[0]?.message?.content || "{}"
      );
      const parsedKeywords = (parsed.keywords || []).join(" ").trim();
      keywords = parsedKeywords.length > 0 ? parsedKeywords : q;
      filters = parsed.filters || {};
    } catch (parseError) {
      console.warn("⚠️ Failed to parse GROQ response, fallback to raw query.");
      keywords = q;
    }

    const filtersString = [];

    if (filters.minStars) {
      filtersString.push(`stars >= ${filters.minStars}`);
    }
    if (filters.minPrice) {
      filtersString.push(`price >= ${filters.minPrice}`);
    }
    if (filters.maxPrice) {
      filtersString.push(`price <= ${filters.maxPrice}`);
    }
    if (filters.categories && Array.isArray(filters.categories)) {
      const categoryFilters = filters.categories.map(
        (cat: string) => `category:"${cat}"`
      );
      filtersString.push(`(${categoryFilters.join(" OR ")})`);
    }

    const searchResult = await index.search<Product>(keywords, {
      page,
      hitsPerPage: limit,
      filters: filtersString.join(" AND ") || undefined,
    });

    return res.json({
      hits: searchResult.hits,
      nbHits: searchResult.nbHits,
      page: searchResult.page,
      nbPages: searchResult.nbPages,
    });
  } catch (err: any) {
    console.error("❌ Error in /api/products:", err.message || err);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = parseInt(process.env.PORT || "4000", 10);
app.listen(PORT, () =>
  console.log(`🚀 Backend listening on http://localhost:${PORT}`)
);
