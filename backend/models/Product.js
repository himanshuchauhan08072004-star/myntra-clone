const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    category: String,
    price: Number,
    originalPrice: Number,
    discount: String,
    rating: Number,
    reviewCount: Number,
    description: String,
    sizes: [String],
    images: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
