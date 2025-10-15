import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    categoryType: {
      type: String,
      required: true,
      enum: ["image", "prompt"],
      default: "prompt",
    },
    recent: {
      default: false,
      type: Boolean,
    },
    latest: {
      default: false,
      type: Boolean,
    },
    mostUsed: {
      default: false,
      type: Boolean,
    },
    trending: {
      default: false,
      type: Boolean,
    },
    metaTags: {
      type: String,
      required: true,
    },  
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isFolder: {
      type: Boolean,
      default: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Category", CategorySchema);
