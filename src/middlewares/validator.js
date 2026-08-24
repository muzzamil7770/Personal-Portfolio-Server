const Joi = require('joi');

// Contact form validation schema
const contactSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must be less than 100 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  subject: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.base': 'Subject must be a string',
      'string.empty': 'Subject is required',
      'string.min': 'Subject must be at least 5 characters',
      'any.required': 'Subject is required'
    }),

  message: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.base': 'Message must be a string',
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'any.required': 'Message is required'
    })
});

// Hire form validation schema
const hireSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  budget: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.base': 'Budget must be a string',
      'string.max': 'Budget must be less than 100 characters'
    }),

  message: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.base': 'Message must be a string',
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'any.required': 'Message is required'
    }),

  services: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.base': 'Services must be a string'
    })
});

const meetingSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  date: Joi.string().required(),
  time: Joi.string().required(),
  topic: Joi.string().min(5).max(500).required()
});

const blogSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must be less than 200 characters',
    'any.required': 'Title is required'
  }),
  excerpt: Joi.string().min(10).max(500).required().messages({
    'string.base': 'Excerpt must be a string',
    'string.empty': 'Excerpt is required',
    'string.min': 'Excerpt must be at least 10 characters',
    'string.max': 'Excerpt must be less than 500 characters',
    'any.required': 'Excerpt is required'
  }),
  content: Joi.string().required().messages({
    'string.base': 'Content must be a string',
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  category: Joi.string().min(2).max(50).required(),
  tags: Joi.array().items(Joi.string().max(60)).optional(),
  image: Joi.string().uri().optional().allow(''),
  status: Joi.string().valid('draft', 'published', 'scheduled').default('draft'),
  scheduledAt: Joi.string().optional().allow('').allow(null),
  author: Joi.string().optional().allow(''),
  readTime: Joi.string().optional().allow(''),
  seoTitle: Joi.string().max(60).optional().allow(''),
  seoDescription: Joi.string().max(160).optional().allow('')
});

module.exports = {
  contactSchema,
  hireSchema,
  meetingSchema,
  blogSchema
};
