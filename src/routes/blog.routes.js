const express = require('express');
const router = express.Router();
const { blogController, getBlogs, getPublicBlogs, getBlogById, updateBlog, deleteBlog, getScheduledBlogs } = require('../controllers/blog.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public — anyone can view published blogs
router.get('/published', getPublicBlogs);

// Admin CRUD (protected)
router.post('/', verifyToken, blogController);
router.get('/', verifyToken, getBlogs);
router.put('/:id', verifyToken, updateBlog);
router.delete('/:id', verifyToken, deleteBlog);
router.get('/admin/scheduled', verifyToken, getScheduledBlogs);

// Public single blog (must be after admin routes to avoid conflicts)
router.get('/:id', getBlogById);

module.exports = router;
