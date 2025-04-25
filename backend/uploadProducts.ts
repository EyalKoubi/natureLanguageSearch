import fs from "fs";
import csv from "csv-parser";
import algoliasearch from "algoliasearch";

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

const client = algoliasearch("WDEDE7E5V5", "8ecacf95cb384237806d82bd9bbd635e");
const index = client.initIndex("veryNewProducts");

const CHUNK_SIZE = 1000;
let productsChunk: Product[] = [];
let totalProductsUploaded = 0;

fs.createReadStream("amz_uk_processed_data.csv")
  .pipe(csv())
  .on("data", async (row: Record<string, string>) => {
    if (!row.title || !row.imgUrl || !row.productURL) return;

    productsChunk.push({
      objectID: row.asin,
      title: row.title,
      image: row.imgUrl,
      link: row.productURL,
      stars: parseFloat(row.stars || "0"),
      reviews: parseInt(row.reviews || "0"),
      price: parseFloat(row.price || "0"),
      isBestSeller: row.isBestSeller === "TRUE",
      category: row.categoryName || "Other",
    });

    if (productsChunk.length === CHUNK_SIZE) {
      try {
        await index.saveObjects(productsChunk);
        totalProductsUploaded += productsChunk.length;
        console.log(`✅ Uploaded ${totalProductsUploaded} products so far...`);
        productsChunk = [];
      } catch (err) {
        console.error("❌ Error uploading chunk:", err);
      }
    }
  })
  .on("end", async () => {
    if (productsChunk.length > 0) {
      try {
        await index.saveObjects(productsChunk);
        totalProductsUploaded += productsChunk.length;
        console.log(
          `✅ Uploaded a total of ${totalProductsUploaded} products!`
        );
      } catch (err) {
        console.error("❌ Error uploading final chunk:", err);
      }
    }
    console.log("🎉 All uploads complete!");
  });
