import Content from '../models/Content.js';
import Section from '../models/Section.js';
import Category from '../models/Category.js';

// Get all content items
export const getAllContent = async (req, res) => {
  try {
    const { sectionId } = req.query;
    let query = {};
    
    if (sectionId) {
      query.section = sectionId;
    }
    
    const content = await Content.find(query)
      .populate({
        path: 'section',
        select: 'name slug category parent',
        populate: [
          {
            path: 'category',
            select: 'name slug image'
          },
        ]
      });
      
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get content by id
export const getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate({
        path: 'section',
        select: 'name slug category parent',
        populate: [
          {
            path: 'category',
            select: 'name slug'
          },
        ]
      });
      
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get content by section
export const getContentBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    // Check if section exists
    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Check if section is a folder
    if (sectionExists.isFolder) {
      return res.status(400).json({ message: 'Cannot get content for a folder section. Content can only be associated with leaf sections.' });
    }
    
    const content = await Content.findOne({ section: sectionId })
      .populate({
        path: 'section',
        select: 'name slug category parent',
        populate: [
          {
            path: 'category',
            select: 'name slug'
          },
        ]
      });
      
    if (!content) {
      // Return empty content structure if none exists yet
      return res.status(200).json({
        section: sectionId,
        title: '',
        subtitle: '',
        images: [],
        fields: []
      });
    }
    
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new content
export const createContent = async (req, res) => {
  try {
    const { section, title, subtitle, slug, images, fields } = req.body;
    
    // Check if section exists and populate its category
    const sectionExists = await Section.findById(section).populate('category');
    if (!sectionExists) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Ensure section has a category
    if (!sectionExists.category) {
      return res.status(400).json({ message: 'Section must belong to a category' });
    }
    
    // Check if section is a folder
    if (sectionExists.isFolder) {
      return res.status(400).json({ message: 'Cannot create content for a folder section. Content can only be associated with leaf sections.' });
    }
    
    // Check if content already exists for this section
    const existingContent = await Content.findOne({ section });
    if (existingContent) {
      return res.status(400).json({ message: 'Content already exists for this section. Use update instead.' });
    }
    
    // Check for slug uniqueness within the category
    if (!slug) {
      return res.status(400).json({ message: 'Slug is required for content' });
    }

    // Find all sections in the same category
    const sectionsInCategory = await Section.find({ category: sectionExists.category._id });
    const sectionIds = sectionsInCategory.map(s => s._id);
    
    // Check if any content in the same category has this slug
    const slugExists = await Content.findOne({
      section: { $in: sectionIds },
      slug: slug
    });
    
    if (slugExists) {
      return res.status(400).json({ 
        message: `Content with slug '${slug}' already exists in category '${sectionExists.category.name}'. Please provide a unique slug.` 
      });
    }
    
    const newContent = new Content({
      section,
      slug,
      title: title || '',
      subtitle: subtitle || '',
      images: images || [],
      fields: fields || []
    });
    
    const savedContent = await newContent.save();
    
    // Populate section info
    const populatedContent = await Content.findById(savedContent._id)
      .populate({
        path: 'section',
        select: 'name slug category parent',
        populate: [
          {
            path: 'category',
            select: 'name slug'
          }
        ]
      });
    
    res.status(201).json(populatedContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update content
export const updateContent = async (req, res) => {
  try {
    const { title, subtitle, slug, images, fields, isActive } = req.body;
    
    // Get current content and populate section with category
    const currentContent = await Content.findById(req.params.id).populate({
      path: 'section',
      populate: {
        path: 'category'
      }
    });
    
    if (!currentContent) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Ensure section has a category
    if (!currentContent.section.category) {
      return res.status(400).json({ message: 'Section must belong to a category' });
    }
    
    // Check for slug uniqueness within the category if it's being changed
    if (slug && slug !== currentContent.slug) {
      // Find all sections in the same category
      const sectionsInCategory = await Section.find({ category: currentContent.section.category._id });
      const sectionIds = sectionsInCategory.map(s => s._id);
      
      // Check if any content in the same category has this slug
      const slugExists = await Content.findOne({
        _id: { $ne: req.params.id }, // Exclude current content
        section: { $in: sectionIds },
        slug: slug
      });
      
      if (slugExists) {
        return res.status(400).json({ 
          message: `Content with slug '${slug}' already exists in category '${currentContent.section.category.name}'. Please provide a unique slug.` 
        });
      }
    }
    
    // Build update object
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (slug !== undefined) updateData.slug = slug;
    if (images !== undefined) updateData.images = images;
    if (fields !== undefined) updateData.fields = fields;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate({
      path: 'section',
      select: 'name slug category parent',
      populate: [
        {
          path: 'category',
          select: 'name slug'
        },
      ]
    });
    
    if (!updatedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.status(200).json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete content
export const deleteContent = async (req, res) => {
  try {
    const deletedContent = await Content.findByIdAndDelete(req.params.id);
    
    if (!deletedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.status(200).json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get content by category
export const getContentByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Verify that category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Get all sections in this category
    const sections = await Section.find({ category: categoryId });
    if (sections.length === 0) {
      return res.status(200).json([]); // Return empty array if no sections found
    }
    
    // Get section IDs
    const sectionIds = sections.map(section => section._id);
    
    // Find all content related to these sections
    const content = await Content.find({ section: { $in: sectionIds } })
      .populate({
        path: 'section',
        select: 'name slug category parent',
        populate: [
          {
            path: 'category',
            select: 'name slug'
          }
        ]
      });
    
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get content by category and slug
export const getContentBySlug = async (req, res) => {
  try {
    const { categoryId, slug } = req.params;
    
    // Verify that category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Get all sections in this category
    const sections = await Section.find({ category: categoryId });
    if (sections.length === 0) {
      return res.status(404).json({ message: 'No sections found in this category' });
    }
    
    // Get section IDs
    const sectionIds = sections.map(section => section._id);
    
    // Find content by slug within these sections
    const content = await Content.findOne({ 
      section: { $in: sectionIds },
      slug: slug
    }).populate({
      path: 'section',
      select: 'name slug category parent',
      populate: [
        {
          path: 'category',
          select: 'name slug image'
        }
      ]
    });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found with this slug in the specified category' });
    }
    
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all content
export const deleteAllContent = async (req, res) => {
  try {
    const result = await Content.deleteMany({});
    
    res.status(200).json({
      message: "All content deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 