import Category from "../models/Category.js";
import Section from "../models/Section.js";
import Content from "../models/Content.js";
import { triggerSitemapUpdate } from "../utils/sitemaputils.js";

// Get all root categories
export const getCategories = async (req, res) => {
  try {
    const { parentId } = req.query;

    let query = {};
    if (parentId) {
      query.parent = parentId;
    } else {
      query.parent = null; // Root categories
    }

    const categories = await Category.find(query).sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category by id
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get child categories if it's a folder
    let children = [];
    if (category.isFolder) {
      children = await Category.find({ parent: category._id }).sort({
        name: 1,
      });
    }

    res.status(200).json({
      ...category._doc,
      children,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category by slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const { parentSlug, slug } = req.params;

    let query = { slug };

    // If parentSlug is provided, find the parent first
    if (parentSlug) {
      const parentCategory = await Category.findOne({ slug: parentSlug });
      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }
      query.parent = parentCategory._id;
    } else {
      query.parent = null; // Root level category
    }

    const category = await Category.findOne(query);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get child categories if it's a folder
    let children = [];
    if (category.isFolder) {
      children = await Category.find({ parent: category._id }).sort({
        name: 1,
      });
    }

    res.status(200).json({
      ...category._doc,
      children,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    const savedCategory = await newCategory.save();
    
    // Trigger sitemap update after creating a category
    triggerSitemapUpdate();
    
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Trigger sitemap update after updating a category
    triggerSitemapUpdate();
    
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    // Check if category has children
    const childCategories = await Category.find({ parent: req.params.id });
    if (childCategories.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category with subcategories. Delete subcategories first or move them.",
        childCount: childCategories.length,
      });
    }

    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Trigger sitemap update after deleting a category
    triggerSitemapUpdate();
    
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all categories
export const deleteAllCategories = async (req, res) => {
  try {
    await Category.deleteMany({});
    
    // Trigger sitemap update after deleting all categories
    triggerSitemapUpdate();
    
    res.status(200).json({ message: "All categories deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete category with related content
export const deleteCategoryWithRelated = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Track deleted items
    const deletedItems = {
      category: 1,
      sections: 0,
      contents: 0,
    };
    
    // Delete all sections in this category
    const sections = await Section.find({ category: categoryId });
    const sectionIds = sections.map((section) => section._id);
    
    if (sectionIds.length > 0) {
      // Delete all contents in these sections
      const deleteContentResult = await Content.deleteMany({
        section: { $in: sectionIds },
      });
      deletedItems.contents = deleteContentResult.deletedCount;
      
      // Delete the sections
      const deleteSectionResult = await Section.deleteMany({
        _id: { $in: sectionIds },
      });
      deletedItems.sections = deleteSectionResult.deletedCount;
    }
    
    // Delete the category
    await Category.findByIdAndDelete(categoryId);
    
    // Trigger sitemap update after deleting category with related content
    triggerSitemapUpdate();
    
    res.status(200).json({
      message: "Category and related content deleted successfully",
      deletedItems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
