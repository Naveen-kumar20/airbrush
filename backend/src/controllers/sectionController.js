import Section from '../models/Section.js';
import Category from '../models/Category.js';

// Get all sections
export const getSections = async (req, res) => {
  try {
    const { categoryId, parentId } = req.query;
    let query = {};
    
    if (categoryId) {
      query.category = categoryId;
    }
    
    if (parentId) {
      query.parent = parentId;
    } else {
      query.parent = null; // Root sections in the category
    }
    
    const sections = await Section.find(query)
      .populate('category', 'name slug')
      .sort({ order: 1, name: 1 });
      
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get section by id
export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('parent', 'name slug');
      
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Get child sections if it's a folder
    let children = [];
    if (section.isFolder) {
      children = await Section.find({ parent: section._id })
        .sort({ order: 1, name: 1 });
    }
    
    res.status(200).json({
      ...section._doc,
      children
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get section by slug
export const getSectionBySlug = async (req, res) => {
  try {
    const { categorySlug, parentSlug, sectionSlug } = req.params;
    
    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    let parentSection = null;
    if (parentSlug) {
      parentSection = await Section.findOne({
        category: category._id,
        slug: parentSlug
      });
      
      if (!parentSection) {
        return res.status(404).json({ message: 'Parent section not found' });
      }
    }
    
    // Find section by slug, category and parent
    const section = await Section.findOne({
      slug: sectionSlug,
      category: category._id,
      parent: parentSection ? parentSection._id : null
    }).populate('category', 'name slug')
      .populate('parent', 'name slug');
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Get child sections if it's a folder
    let children = [];
    if (section.isFolder) {
      children = await Section.find({ parent: section._id })
        .sort({ order: 1, name: 1 });
    }
    
    res.status(200).json({
      ...section._doc,
      children
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new section
export const createSection = async (req, res) => {
  try {
    const { name, slug, description, category, parent, isFolder, order, isActive } = req.body;
    
    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if parent exists if provided
    if (parent) {
      const parentExists = await Section.findById(parent);
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent section not found' });
      }
      if (!parentExists.isFolder) {
        return res.status(400).json({ message: 'Parent must be a folder' });
      }
      // Ensure parent is in the same category
      if (parentExists.category.toString() !== category) {
        return res.status(400).json({ message: 'Parent section must be in the same category' });
      }
    }
    
    // Check if section with same name/slug exists at the same level in the category
    const existingSection = await Section.findOne({
      category,
      parent: parent || null,
      $or: [
        { name },
        { slug: slug || name.toLowerCase().replace(/\s+/g, '-') }
      ]
    });
    
    if (existingSection) {
      return res.status(400).json({ message: 'Section with this name or slug already exists at this level' });
    }
    
    const newSection = new Section({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      category,
      isFolder: isFolder !== undefined ? isFolder : true,
      isActive: isActive !== undefined ? isActive : true
    });
    
    const savedSection = await newSection.save();
    
    // Populate category and parent info
    const populatedSection = await Section.findById(savedSection._id)
      .populate('category', 'name slug')
    
    res.status(201).json(populatedSection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update section
export const updateSection = async (req, res) => {
  try {
    const { name, slug, description, category, parent, isFolder, order, isActive } = req.body;
    
    // Get current section
    const currentSection = await Section.findById(req.params.id);
    if (!currentSection) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // If category is being updated, check if it exists
    let categoryId = currentSection.category;
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
      categoryId = category;
    }
    
    // If parent is being updated, check if it exists
    if (parent !== undefined) {
      if (parent) {
        const parentExists = await Section.findById(parent);
        if (!parentExists) {
          return res.status(404).json({ message: 'Parent section not found' });
        }
        if (!parentExists.isFolder) {
          return res.status(400).json({ message: 'Parent must be a folder' });
        }
        // Ensure parent is in the same category
        if (parentExists.category.toString() !== categoryId.toString()) {
          return res.status(400).json({ message: 'Parent section must be in the same category' });
        }
        // Check for circular reference
        if (parent === req.params.id) {
          return res.status(400).json({ message: 'A section cannot be its own parent' });
        }
      }
    }
    
    // Check for duplicate name/slug in the same level
    if (name || slug) {
      const targetParent = parent !== undefined ? parent : currentSection.parent;
      const newSlug = slug || (name ? name.toLowerCase().replace(/\s+/g, '-') : currentSection.slug);
      
      const existingSection = await Section.findOne({
        _id: { $ne: req.params.id },
        category: categoryId,
        parent: targetParent,
        $or: [
          { name: name || currentSection.name },
          { slug: newSlug }
        ]
      });
      
      if (existingSection) {
        return res.status(400).json({ message: 'Section with this name or slug already exists at this level' });
      }
    }
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (parent !== undefined) updateData.parent = parent;
    if (isFolder !== undefined) updateData.isFolder = isFolder;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedSection = await Section.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category', 'name slug')
      .populate('parent', 'name slug');
    
    if (!updatedSection) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    res.status(200).json(updatedSection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete section
export const deleteSection = async (req, res) => {
  try {
    // Check if section has children
    const childSections = await Section.find({ parent: req.params.id });
    if (childSections.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete section with subsections. Delete subsections first or move them.',
        childCount: childSections.length
      });
    }
    
    const deletedSection = await Section.findByIdAndDelete(req.params.id);
    
    if (!deletedSection) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    res.status(200).json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all sections
export const deleteAllSections = async (req, res) => {
  try {
    // First check if there are any sections with children
    const sectionsWithChildren = await Section.find({
      parent: { $ne: null }
    });

    if (sectionsWithChildren.length > 0) {
      return res.status(400).json({
        message: "Cannot delete all sections while there are subsections. Delete subsections first.",
        subsectionCount: sectionsWithChildren.length
      });
    }

    const result = await Section.deleteMany({});
    
    res.status(200).json({
      message: "All sections deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get sections by category ID
export const getSectionsByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Check if category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get all sections in the category
    const sections = await Section.find({ category: categoryId })
      .populate('category', 'name slug')
      .sort({ order: 1, name: 1 });
    
    res.status(200).json({
      category: {
        _id: categoryExists._id,
        name: categoryExists.name,
        slug: categoryExists.slug
      },
      sections
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 