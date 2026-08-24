const { blogSchema } = require('../middlewares/validator');
const { saveBlog, getAllBlogs, getPublishedBlogs, getScheduledBlogs, getBlogById, updateBlog, deleteBlog } = require('../utils/db');
const logger = require('../utils/logger');

const blogController = async (req, res, next) => {
  try {
    const { error, value } = blogSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(d => d.message)
      });
    }

    const record = {
      id: Date.now().toString(),
      ...value,
      tags: value.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveBlog(record);
    logger.info(`Blog saved to Firestore: ${record.id}`);

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: record
    });
  } catch (error) {
    logger.error('Blog creation failed:', error);
    next(error);
  }
};

const getBlogs = async (req, res, next) => {
  try {
    const blogs = await getAllBlogs();
    res.json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

const getPublicBlogs = async (req, res, next) => {
  try {
    const blogs = await getPublishedBlogs();
    res.json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

const getBlogByIdHandler = async (req, res, next) => {
  try {
    const record = await getBlogById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Blog post not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

const updateBlogHandler = async (req, res, next) => {
  try {
    const updated = await updateBlog(req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteBlogHandler = async (req, res, next) => {
  try {
    await deleteBlog(req.params.id);
    res.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getScheduledBlogsHandler = async (req, res, next) => {
  try {
    const blogs = await getScheduledBlogs();
    res.json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  blogController,
  getBlogs,
  getPublicBlogs,
  getBlogById: getBlogByIdHandler,
  updateBlog: updateBlogHandler,
  deleteBlog: deleteBlogHandler,
  getScheduledBlogs: getScheduledBlogsHandler
};
