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
      "https://groq.com/?gad_source=1&gbraid=0AAAAAoNZBHFTo_coCfdj7KSMINpU79_ru&gclid=Cj0KCQjw5azABhD1ARIsAA0WFUHn7uP-PhDmYz_hEeffsbnPEOR3T0SEs95CSVQoPErJSBBrCIB8mu0aAo0WEALw_wcB",
      {
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: "Convert natural language product search into keywords.",
          },
          {
            role: "user",
            content: q,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const keywords = groqResponse.data.choices?.[0]?.message?.content || q;

    const searchResult = await index.search<Product>(keywords, {
      page,
      hitsPerPage: limit,
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
