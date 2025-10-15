import mongoose from "mongoose";

// Define a schema for the content field values
const ContentFieldValueSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    key: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
    },
    title: {
      type: String,
    },
    lead: {
      type: Boolean,
    },
    content: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }  // Disable _id for the nested schema
);

const ContentFieldSchema = new mongoose.Schema(
  {
    value: ContentFieldValueSchema
  },
  { _id: true }
);

const ContentSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    images: [
      {
        url: String,
        alt: String,
        title: String,
        prompt: String,
        width: Number,
        height: Number,
        order: Number,
      },
    ],
    fields: [ContentFieldSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Content", ContentSchema);
