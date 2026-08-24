const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');
const { getPublishedBlogs } = require('../utils/db');

/**
 * AI Chatbot Service
 * Primary: Google Gemini API
 * Fallback: OpenRouter API (free models)
 * Local: Ollama (self-hosted backup)
 * 
 * Production-ready with automatic failover, rate limiting, and conversation memory
 */
class AIChatbotService {
  constructor() {
    // Initialize Gemini only if API key exists
    this.geminiClient = null;
    this.geminiModel = null;
    this.geminiEnabled = false;
    
    if (config.ai.geminiApiKey && config.ai.geminiApiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
        this.geminiModel = genAI.getGenerativeModel({ 
          model: config.ai.geminiModel,
          generationConfig: {
            maxOutputTokens: config.ai.maxTokens ,
            temperature: config.ai.temperature ,
            topP: config.ai.topP ,
            topK: config.ai.topK ,
          }
        });
        this.geminiClient = genAI;
        this.geminiEnabled = true;
        logger.info('✅ Gemini AI initialized');
      } catch (error) {
        logger.error('❌ Gemini AI initialization failed:', error.message);
      }
    } else {
      logger.info('ℹ️  Gemini AI disabled (no API key provided)');
    }

    // OpenRouter config - only enable if API key exists
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    this.openRouterEnabled = config.ai.openRouterApiKey && config.ai.openRouterApiKey.trim() !== '';
    this.openRouterHeaders = this.openRouterEnabled ? {
      'Authorization': `Bearer ${config.ai.openRouterApiKey}`,
      'HTTP-Referer': config.ai.siteUrl,
      'X-Title': 'Portfolio AI Assistant',
    } : null;
    
    if (this.openRouterEnabled) {
      logger.info('✅ OpenRouter AI initialized');
    } else {
      logger.info('ℹ️  OpenRouter AI disabled (no API key provided)');
    }

    // Ollama config
    this.ollamaBaseUrl = config.ai.ollamaBaseUrl;
    this.ollamaEnabled = true; // Always try Ollama as it's local

    // Conversation memory (per session)
    this.conversations = new Map();

    // Portfolio knowledge base
    this.knowledgeBase = this.buildKnowledgeBase();

    // Usage tracking
    this.usageStats = {
      totalRequests: 0,
      geminiRequests: 0,
      openRouterRequests: 0,
      ollamaRequests: 0,
      failedRequests: 0,
      fallbackActivations: 0,
    };
  }

  /**
   * Build portfolio knowledge base for AI context
   */
  buildKnowledgeBase() {
    return {
      portfolio: {
        owner: 'Muhammad Muzzamil',
        role: 'Full-Stack Developer',
        techStack: {
          frontend: ['Angular 17+', 'TypeScript', 'RxJS', 'SCSS', 'GSAP', 'Three.js'],
          backend: ['Node.js', 'Express.js', 'Firebase Firestore', 'Firebase Realtime DB'],
          authentication: ['JWT', '2FA with OTP', 'Email verification'],
          services: ['Nodemailer', 'Winston Logger', 'Helmet Security', 'Rate Limiting'],
        },
        features: [
          'Responsive portfolio with 10 scrollable sections',
          'Contact form with email notifications',
          'Hire me functionality with admin dashboard',
          'Real-time analytics with visitor tracking',
          'CV/Resume viewer with PDF support',
          'Admin panel with CRUD operations',
          '7 customizable themes',
          'AI-powered chatbot assistant',
        ],
        projects: [
          {
            name: 'Personal Portfolio',
            description: 'Full-stack portfolio with Angular 17, Express.js, and Firebase',
            tech: ['Angular', 'Express.js', 'Firebase', 'GSAP', 'Three.js'],
          },
        ],
        contact: {
          email: 'Available via contact form',
          availability: 'Open for freelance and full-time opportunities',
        },
        commands: {
          about: 'Tell about Muhammad Muzzamil',
          skills: 'List technical skills and expertise',
          projects: 'Showcase portfolio projects',
          experience: 'Work experience and background',
          education: 'Educational background',
          contact: 'How to get in touch',
          hire: 'Information about hiring for projects',
          themes: 'Available UI themes',
          techstack: 'Detailed technology stack used',
          features: 'Portfolio features and capabilities',
          help: 'List all available commands',
          resume: 'Information about CV/Resume',
          services: 'Services offered',
          pricing: 'Pricing and rates information',
          availability: 'Current availability status',
          timeline: 'Project timeline and delivery',
          process: 'Development process and methodology',
          testimonials: 'Client testimonials and feedback',
          blog: 'Blog posts and articles',
          social: 'Social media profiles and links',
        }
      }
    };
  }

  /**
   * Get or create conversation session
   */
  getConversation(sessionId) {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        messages: [],
        createdAt: Date.now(),
        lastActive: Date.now(),
        messageCount: 0,
      });
    }
    
    const conversation = this.conversations.get(sessionId);
    conversation.lastActive = Date.now();
    return conversation;
  }

  /**
   * Clean up old conversations (older than 1 hour)
   */
  cleanupOldConversations() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [sessionId, conversation] of this.conversations.entries()) {
      if (conversation.lastActive < oneHourAgo) {
        this.conversations.delete(sessionId);
      }
    }
  }

  /**
   * Process command/keyword from user message
   */
  processCommand(message) {
    const lowerMsg = message.toLowerCase().trim();
    const kb = this.knowledgeBase.portfolio;

    // Direct command matching
    const commandMap = {
      'about': () => ({
        text: `**Muhammad Muzzamil** is a passionate Full-Stack Developer specializing in modern web technologies.\n\n👨‍💻 **Role:** Full-Stack Developer\n🎯 **Focus:** Building scalable, user-centric applications\n🚀 **Expertise:** Angular, Node.js, Express.js, Firebase, and cloud technologies\n\nWith expertise in both frontend and backend development, Muhammad creates complete, production-ready solutions.`,
        command: 'about',
      }),
      
      'skills': () => ({
        text: `🛠️ **Technical Skills & Expertise**\n\n**Frontend:**\n• Angular 17+ & TypeScript\n• RxJS & State Management\n• SCSS & Responsive Design\n• GSAP Animations\n• Three.js & WebGL\n\n**Backend:**\n• Node.js & Express.js\n• REST API Design\n• Firebase Firestore & Realtime DB\n• JWT Authentication\n• 2FA Implementation\n\n**DevOps & Tools:**\n• Git & Version Control\n• CI/CD Pipelines\n• Cloud Deployment\n• Performance Optimization`,
        command: 'skills',
      }),

      'projects': () => ({
        text: `📁 **Featured Projects**\n\n**1. Personal Portfolio (Full-Stack)**\n• Full-stack portfolio application\n• Angular 17+ frontend with 10 sections\n• Express.js backend with Firebase\n• AI-powered chatbot assistant\n• Real-time analytics dashboard\n• 7 customizable themes\n\n**Tech Stack:** Angular, Express.js, Firebase, GSAP, Three.js, Nodemailer\n\n*More projects coming soon!*`,
        command: 'projects',
      }),

      'experience': () => ({
        text: `💼 **Professional Experience**\n\nMuhammad Muzzamil has extensive experience in:\n\n• **Full-Stack Development** - Building complete web applications from frontend to backend\n• **Angular Development** - Creating responsive, feature-rich SPAs with Angular 17+\n• **API Development** - Designing and implementing RESTful APIs with Express.js\n• **Database Management** - Working with Firebase Firestore and Realtime Database\n• **Authentication Systems** - Implementing secure JWT and 2FA solutions\n• **Performance Optimization** - Ensuring fast, efficient applications\n\n*Detailed work history coming soon!*`,
        command: 'experience',
      }),

      'education': () => ({
        text: `🎓 **Education**\n\nMuhammad Muzzamil has a strong foundation in computer science and software development.\n\n**Focus Areas:**\n• Computer Science Fundamentals\n• Software Engineering\n• Web Development\n• Database Management\n• Cloud Computing\n\n*Detailed educational background coming soon!*`,
        command: 'education',
      }),

      'contact': () => ({
        text: `📬 **Get In Touch**\n\nYou can reach Muhammad through:\n\n• **Contact Form** - Available on the portfolio website\n• **Hire Me** - For project inquiries\n• **Email** - Via the portfolio contact form\n\nI'm always open to discussing new opportunities, collaborations, or just having a tech chat! 😊`,
        command: 'contact',
      }),

      'hire': () => ({
        text: `🤝 **Hiring Information**\n\nMuhammad is available for:\n\n• **Freelance Projects** - Short-term and long-term engagements\n• **Full-time Positions** - Remote opportunities\n• **Consulting** - Technical guidance and architecture\n• **Code Reviews** - Professional code review services\n\n**Services Offered:**\n• Full-Stack Web Development\n• Angular Application Development\n• API Design & Development\n• Database Architecture\n• Performance Optimization\n\nUse the **Hire Me** form on the portfolio to get started!`,
        command: 'hire',
      }),

      'themes': () => ({
        text: `🎨 **Available Themes (7 Total)**\n\nThe portfolio features 7 beautiful themes:\n\n1. **Dark** (Default) - Easy on the eyes\n2. **Light** - Clean and bright\n3. **Ocean** - Calming blue tones\n4. **Forest** - Nature-inspired greens\n5. **Rose** - Warm pink accents\n6. **Midnight** - Deep purple vibes\n7. **Amber** - Golden hour feel\n\nAll themes support seamless switching and are fully accessible!`,
        command: 'themes',
      }),

      'techstack': () => ({
        text: `⚙️ **Complete Technology Stack**\n\n**Frontend:**\n• Angular 17+ (Standalone Components)\n• TypeScript 5.4+\n• SCSS with CSS Custom Properties\n• RxJS for reactive programming\n• GSAP for animations\n• Three.js for 3D graphics\n• SweetAlert2 for dialogs\n\n**Backend:**\n• Node.js & Express.js 4.18\n• Firebase Firestore (Database)\n• Firebase Realtime DB (Presence)\n• JWT for authentication\n• Nodemailer for emails\n• Winston for logging\n• Helmet for security\n• Joi for validation\n• Express Rate Limit`,
        command: 'techstack',
      }),

      'features': () => ({
        text: `✨ **Portfolio Features**\n\n**User-Facing:**\n• 10 scrollable portfolio sections\n• Responsive design (mobile-first)\n• 7 customizable themes\n• Smooth scroll animations\n• 3D graphics integration\n• CV/Resume viewer\n• Contact form with email\n• Hire me functionality\n• Real-time visitor analytics\n• AI chatbot assistant\n\n**Admin Panel:**\n• Secure login with 2FA\n• Contact management (CRUD)\n• Hire request management\n• Real-time analytics dashboard\n• Theme picker\n• Visitor tracking\n• Session management`,
        command: 'features',
      }),

      'help': () => ({
        text: `🤖 **Available Commands**\n\nType any of these commands:\n\n• \`about\` - Learn about Muhammad\n• \`skills\` - Technical expertise\n• \`projects\` - View portfolio projects\n• \`experience\` - Work history\n• \`education\` - Academic background\n• \`contact\` - Get in touch\n• \`hire\` - Hiring information\n• \`themes\` - Available UI themes\n• \`techstack\` - Technology details\n• \`features\` - Portfolio capabilities\n• \`resume\` - CV/Resume info\n• \`services\` - Services offered\n• \`pricing\` - Rates information\n• \`availability\` - Current status\n• \`social\` - Social media links\n\nOr just **ask me anything** about Muhammad's portfolio! 😊`,
        command: 'help',
      }),

      'resume': () => ({
        text: `📄 **CV / Resume**\n\nYou can view Muhammad's complete CV directly on the portfolio:\n\n• Click the **"View CV"** button in the navigation\n• PDF viewer with download option\n• Real-time streaming with progress tracking\n\nThe CV includes:\n• Professional summary\n• Work experience\n• Education history\n• Technical skills\n• Certifications\n• Projects\n\n*Updated regularly with latest achievements!*`,
        command: 'resume',
      }),

      'services': () => ({
        text: `💼 **Services Offered**\n\n**Web Development:**\n• Full-Stack Application Development\n• Angular SPA Development\n• RESTful API Development\n• Database Design & Architecture\n• Authentication & Security\n\n**Specialized Services:**\n• UI/UX Implementation\n• Responsive Design\n• Animation & Interactions\n• Performance Optimization\n• Code Review & Refactoring\n• Technical Consulting\n\n**Technologies:**\n• Angular, TypeScript, JavaScript\n• Node.js, Express.js\n• Firebase, Firestore\n• SCSS, CSS, HTML\n\nReady to bring your ideas to life! 🚀`,
        command: 'services',
      }),

      'pricing': () => ({
        text: `💰 **Pricing & Rates**\n\nPricing varies based on project scope and complexity:\n\n**Factors Considered:**\n• Project size and duration\n• Feature complexity\n• Technology requirements\n• Timeline and deadlines\n• Ongoing maintenance needs\n\n**Engagement Types:**\n• Hourly consulting\n• Fixed-price projects\n• Monthly retainers\n• Full-time positions\n\nFor a detailed quote, please use the **Hire Me** form with your project requirements!`,
        command: 'pricing',
      }),

      'availability': () => ({
        text: `📅 **Current Availability**\n\nMuhammad is currently:\n\n✅ **Open to:**\n• Freelance projects\n• Full-time remote positions\n• Consulting opportunities\n• Collaborative projects\n\n⏰ **Response Time:**\n• Portfolio inquiries: Within 24 hours\n• Project proposals: Within 48 hours\n• General questions: As soon as possible\n\nUse the **Contact Form** or **Hire Me** feature to get started!`,
        command: 'availability',
      }),

      'timeline': () => ({
        text: `⏱️ **Project Timeline**\n\nTypical project timelines:\n\n• **Small projects:** 1-2 weeks\n• **Medium projects:** 2-4 weeks\n• **Large projects:** 4-8 weeks\n• **Enterprise projects:** 8+ weeks\n\n**Process:**\n1. Discovery & Planning (1-2 days)\n2. Design & Architecture (2-3 days)\n3. Development (varies)\n4. Testing & QA (3-5 days)\n5. Deployment & Handoff (1-2 days)\n\nTimelines are customized per project requirements!`,
        command: 'timeline',
      }),

      'process': () => ({
        text: `🔄 **Development Process**\n\n**1. Discovery Phase**\n• Requirements gathering\n• Project scoping\n• Technical architecture planning\n\n**2. Design Phase**\n• UI/UX wireframes\n• Component architecture\n• Database schema design\n\n**3. Development Phase**\n• Agile methodology\n• Regular progress updates\n• Continuous integration\n\n**4. Testing Phase**\n• Unit testing\n• Integration testing\n• Performance optimization\n\n**5. Deployment**\n• Production deployment\n• Documentation\n• Knowledge transfer\n\nClean, maintainable code guaranteed! ✨`,
        command: 'process',
      }),

      'testimonials': () => ({
        text: `⭐ **Testimonials**\n\nClient feedback and testimonials are being collected and will be featured soon.\n\n**What clients say:**\n• Professional and responsive\n• Clean, well-documented code\n• Delivers on time\n• Great communication throughout\n• Goes above and beyond\n\n*Stay tuned for detailed testimonials!*`,
        command: 'testimonials',
      }),

      'blog': async () => {
        try {
          const blogs = await getPublishedBlogs();
          if (blogs.length === 0) {
            return {
              text: `📝 **Blog & Articles**\n\nNo blog posts have been published yet. Check back soon for articles on Angular, Full-Stack Development, and more!`,
              command: 'blog'
            };
          }
          const blogList = blogs.slice(0, 5).map((b, i) => `${i + 1}. **${b.title}** (${b.category})`).join('\n');
          return {
            text: `📝 **Latest Blog Posts**\n\n${blogList}\n\nVisit the blog section to read full articles!`,
            command: 'blog'
          };
        } catch (err) {
          return {
            text: `📝 **Blog & Articles**\n\nMuhammad shares knowledge through technical blog posts about Angular, Full-Stack development, and more. Blog section coming soon!`,
            command: 'blog'
          };
        }
      },

      'social': () => ({
        text: `🌐 **Connect Online**\n\nFind Muhammad Muzzamil on:\n\n• **GitHub** - Portfolio repositories\n• **LinkedIn** - Professional network\n• **Portfolio Website** - Full showcase\n\n*Links available on the portfolio website!*`,
        command: 'social',
      }),
    };

    // Check for command matches
    for (const [key, handler] of Object.entries(commandMap)) {
      if (lowerMsg === key || lowerMsg.includes(`/${key}`) || lowerMsg.startsWith(`what is ${key}`) || lowerMsg.startsWith(`tell me about ${key}`)) {
        return handler();
      }
    }

    // Fuzzy matching for partial matches
    if (lowerMsg.includes('skill') || lowerMsg.includes('tech') || lowerMsg.includes('expertise')) {
      return commandMap.skills();
    }
    if (lowerMsg.includes('project') || lowerMsg.includes('work') || lowerMsg.includes('portfolio')) {
      return commandMap.projects();
    }
    if (lowerMsg.includes('contact') || lowerMsg.includes('reach') || lowerMsg.includes('email')) {
      return commandMap.contact();
    }
    if (lowerMsg.includes('hire') || lowerMsg.includes('job') || lowerMsg.includes('work together')) {
      return commandMap.hire();
    }
    if (lowerMsg.includes('theme') || lowerMsg.includes('color') || lowerMsg.includes('dark')) {
      return commandMap.themes();
    }
    if (lowerMsg.includes('help') || lowerMsg.includes('command') || lowerMsg.includes('what can you do')) {
      return commandMap.help();
    }
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('rate') || lowerMsg.includes('charge')) {
      return commandMap.pricing();
    }
    if (lowerMsg.includes('available') || lowerMsg.includes('free time') || lowerMsg.includes('open')) {
      return commandMap.availability();
    }
    if (lowerMsg.includes('social') || lowerMsg.includes('linkedin') || lowerMsg.includes('github')) {
      return commandMap.social();
    }

    return null; // No command matched
  }

  /**
   * Build system prompt with portfolio context
   */
  buildSystemPrompt() {
    const kb = this.knowledgeBase.portfolio;
    return `You are an AI assistant for Muhammad Muzzamil's professional portfolio website.

YOUR ROLE:
- You help visitors learn about Muhammad Muzzamil, a Full-Stack Developer
- You answer questions about skills, projects, experience, and services
- You guide users to appropriate contact/hire forms when needed
- You are friendly, professional, and knowledgeable

ABOUT MUHAMMAD MUZZAMIL:
- Role: Full-Stack Developer
- Expertise: Angular 17+, Node.js, Express.js, Firebase, TypeScript
- Specializes in: Building scalable, user-centric web applications
- Available for: Freelance projects, full-time positions, consulting

TECH STACK:
Frontend: Angular 17+, TypeScript, RxJS, SCSS, GSAP, Three.js
Backend: Node.js, Express.js, Firebase Firestore, Firebase Realtime DB
Security: JWT, 2FA, Helmet, Rate Limiting, Joi Validation
Services: Nodemailer, Winston Logger

PORTFOLIO FEATURES:
- 10 scrollable sections with responsive design
- 7 customizable themes (Dark, Light, Ocean, Forest, Rose, Midnight, Amber)
- Real-time analytics dashboard
- Admin panel with CRUD operations
- AI chatbot assistant (that's you!)
- CV/Resume viewer

RESPONSE GUIDELINES:
- Be concise but informative (2-4 paragraphs max)
- Use markdown formatting for readability
- Include relevant emojis sparingly (🚀✨💼🎯)
- Always be positive and professional
- If unsure, direct to contact form
- Never make up false information
- Use bullet points for lists
- Keep responses under 500 words

When asked about specific topics, reference the portfolio knowledge base.
Always maintain a helpful and professional tone.`;
  }

  /**
   * Send request to Gemini API (Primary)
   */
  async sendToGemini(message, conversationHistory) {
    if (!this.geminiEnabled || !this.geminiModel) {
      throw new Error('Gemini not configured or disabled');
    }

    // Build chat from conversation history
    const chat = this.geminiModel.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    this.usageStats.geminiRequests++;
    logger.info(`Gemini response received (${text.length} chars)`);
    
    return {
      provider: 'gemini',
      text: text,
      usage: {
        promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
      }
    };
  }

  /**
   * Send request to OpenRouter API (Fallback)
   */
  async sendToOpenRouter(message, conversationHistory) {
    if (!this.openRouterEnabled || !this.openRouterHeaders) {
      throw new Error('OpenRouter not configured or disabled');
    }

    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      `${this.openRouterBaseUrl}/chat/completions`,
      {
        model: config.ai.openRouterModel,
        messages: messages,
        max_tokens: config.ai.maxTokens ,
        temperature: config.ai.temperature ,
        top_p: config.ai.topP ,
      },
      {
        headers: this.openRouterHeaders,
        timeout: 30000,
      }
    );

    const text = response.data.choices[0].message.content;
    this.usageStats.openRouterRequests++;
    logger.info(`OpenRouter response received (${text.length} chars)`);

    return {
      provider: 'openrouter',
      text: text,
      usage: {
        promptTokens: response.data.usage?.prompt_tokens || 0,
        candidatesTokens: response.data.usage?.completion_tokens || 0,
      }
    };
  }

  /**
   * Send request to Ollama API (Local backup)
   */
  async sendToOllama(message, conversationHistory) {
    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      `${this.ollamaBaseUrl}/api/chat`,
      {
        model: config.ai.ollamaModel ,
        messages: messages,
        stream: false,
        options: {
          num_predict: config.ai.maxTokens ,
          temperature: config.ai.temperature,
          top_p: config.ai.topP || 0.95,
        }
      },
      {
        timeout: 60000,
      }
    );

    const text = response.data.message.content;
    this.usageStats.ollamaRequests++;
    logger.info(`Ollama response received (${text.length} chars)`);

    return {
      provider: 'ollama',
      text: text,
      usage: { promptTokens: 0, candidatesTokens: 0 }
    };
  }

  /**
   * Main chat method with automatic failover
   */
  async chat(sessionId, message, conversationHistory = []) {
    this.usageStats.totalRequests++;

    // Clean up old conversations periodically
    if (this.usageStats.totalRequests % 10 === 0) {
      this.cleanupOldConversations();
    }

    // Check for direct commands first (instant response, no API needed)
    const commandResult = this.processCommand(message);
    if (commandResult) {
      return {
        success: true,
        text: commandResult.text,
        command: commandResult.command,
        provider: 'local',
        timestamp: new Date().toISOString(),
        usage: { promptTokens: 0, candidatesTokens: 0 }
      };
    }

    // Build provider list dynamically based on what's enabled
    const providers = [];
    
    if (this.geminiEnabled) {
      providers.push({ name: 'Gemini', fn: () => this.sendToGemini(message, conversationHistory) });
    }
    
    if (this.openRouterEnabled) {
      providers.push({ name: 'OpenRouter', fn: () => this.sendToOpenRouter(message, conversationHistory) });
    }
    
    // Always try Ollama as last resort
    providers.push({ name: 'Ollama', fn: () => this.sendToOllama(message, conversationHistory) });

    // If no providers are available, return fallback message
    if (providers.length === 0) {
      return {
        success: false,
        text: "🤖 AI services are currently unavailable. Please configure an API key in your .env file, or try one of the built-in commands like /help, /about, /skills, etc.",
        command: null,
        provider: 'none',
        timestamp: new Date().toISOString(),
        error: 'No AI providers configured'
      };
    }

    let lastError = null;

    for (const provider of providers) {
      try {
        const result = await provider.fn();
        return {
          success: true,
          text: result.text,
          command: null,
          provider: result.provider,
          timestamp: new Date().toISOString(),
          usage: result.usage
        };
      } catch (error) {
        lastError = error;
        this.usageStats.failedRequests++;
        logger.warn(`${provider.name} failed: ${error.message}`);

        // If this wasn't the last provider, log fallback activation
        if (provider.name !== 'Ollama') {
          this.usageStats.fallbackActivations++;
          logger.info(`⚡ Fallback activated: ${provider.name} → Next provider`);
        }
      }
    }

    // All providers failed
    logger.error(`All AI providers failed. Last error: ${lastError?.message}`);
    
    return {
      success: false,
      text: "I'm sorry, I'm having trouble connecting to my AI services right now. Please try again in a moment, or use the contact form to reach out directly! 📬",
      command: null,
      provider: 'none',
      timestamp: new Date().toISOString(),
      error: lastError?.message || 'All providers failed'
    };
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      ...this.usageStats,
      activeConversations: this.conversations.size,
      successRate: this.usageStats.totalRequests > 0 
        ? ((this.usageStats.totalRequests - this.usageStats.failedRequests) / this.usageStats.totalRequests * 100).toFixed(1)
        : '100.0'
    };
  }

  /**
   * Clear conversation history for a session
   */
  clearConversation(sessionId) {
    this.conversations.delete(sessionId);
    return { success: true, message: 'Conversation cleared' };
  }
}

// Export singleton instance
module.exports = new AIChatbotService();
