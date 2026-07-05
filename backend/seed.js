// One-time data loader: pushes backend/product.json and backend/category.json
// into your MongoDB so the app isn't empty on first run.
//
// Usage:
//   cd backend
//   node seed.js
//
// Requires .env with MONGO_URI already set (see .env.example).

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const Product = require("./models/Product");
const Category = require("./models/Category");

dotenv.config();

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in .env — copy .env.example to .env and fill it in first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const productData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "product.json"), "utf-8")
  );
  const categoryData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "category.json"), "utf-8")
  );

  await Product.deleteMany({});
  await Category.deleteMany({});
  console.log("Cleared old products/categories");

  // strip the numeric "id" field from the sample data, let Mongo assign _id
  const cleanProducts = productData.map(({ id, ...rest }) => rest);
  const insertedProducts = await Product.insertMany(cleanProducts);
  console.log(`Inserted ${insertedProducts.length} products`);

  // sample category.json has stale $oid references from the original author's
  // DB — those won't exist in your database, so we drop them and instead
  // link every category to all products (fine for a demo; refine later if
  // you want categories to filter products for real).
  const allProductIds = insertedProducts.map((p) => p._id);
  const cleanCategories = categoryData.map(({ productId, ...rest }) => ({
    ...rest,
    productId: allProductIds,
  }));
  const insertedCategories = await Category.insertMany(cleanCategories);
  console.log(`Inserted ${insertedCategories.length} categories`);

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
