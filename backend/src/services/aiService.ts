import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import * as crypto from 'crypto';
import fetch from 'node-fetch';

const ENCRYPTION_KEY = process.env.AI_API_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class AIService {
  /**
   * Decrypt API key
   */
  private static decryptApiKey(encryptedData: string): string {
    try {
      // Check if encryption key is set (not randomly generated)
      if (!process.env.AI_API_ENCRYPTION_KEY) {
        logger.warn({
          message: 'AI_API_ENCRYPTION_KEY not set - using random key. API keys cannot be decrypted after server restart.',
        });
      }

      // Handle empty encrypted data (for Ollama)
      if (!encryptedData || encryptedData.trim().length === 0) {
        return '';
      }

      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format.');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      logger.error({
        message: 'Failed to decrypt API key',
        error: error.message,
      });
      throw new CustomError('Failed to decrypt API key. Please update the configuration.', 500);
    }
  }

  /**
   * Get the default active AI configuration
   */
  static async getDefaultConfig() {
    const [configs] = await db.query(
      'SELECT * FROM ai_api_configs WHERE is_active = TRUE AND is_default = TRUE LIMIT 1'
    );

    const configsArray = configs as any[];
    if (configsArray.length === 0) {
      // Fallback: get any active config
      const [anyConfig] = await db.query(
        'SELECT * FROM ai_api_configs WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
      );
      const anyConfigArray = anyConfig as any[];
      if (anyConfigArray.length === 0) {
        throw new CustomError('No active AI configuration found. Please configure an AI provider in Administration.', 404);
      }
      return anyConfigArray[0];
    }

    return configsArray[0];
  }

  /**
   * Call the AI Provider with messages array (for chat/conversation)
   */
  private static async callProviderWithMessages(config: any, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
    const decryptedApiKey = config.api_key_encrypted ? this.decryptApiKey(config.api_key_encrypted) : '';
    const baseUrl = config.base_url || 'https://api.openai.com/v1';
    const providerName = config.provider_name?.toLowerCase() || '';
    const modelName = config.model_name;

    let url: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: any;

    // Ollama (Local)
    if (providerName.includes('ollama') || baseUrl.includes('localhost:11434')) {
      url = `${baseUrl}/chat/completions`;
      body = JSON.stringify({
        model: modelName,
        messages: messages,
        stream: false
      });
    }
    // OpenAI Compatible (Default)
    else {
      if (!decryptedApiKey) throw new Error('API key is required');
      url = `${baseUrl}/chat/completions`;
      headers['Authorization'] = `Bearer ${decryptedApiKey}`;
      body = JSON.stringify({
        model: modelName,
        messages: messages,
        max_tokens: config.max_tokens || 1000,
        temperature: config.temperature || 0.7,
      });
    }

    try {
      const response = await fetch(url, { method: 'POST', headers, body });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(JSON.stringify(errorData));
      }

      const data: any = await response.json();

      // Parse response
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content; // OpenAI/Ollama
      if (data.response) return data.response; // Generic

      return JSON.stringify(data);
    } catch (error: any) {
      logger.error({
        message: 'AI Provider Call Failed',
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Call the AI Provider
   */
  static async callProvider(config: any, prompt: string, systemPrompt?: string): Promise<string> {
    const decryptedApiKey = config.api_key_encrypted ? this.decryptApiKey(config.api_key_encrypted) : '';
    const baseUrl = config.base_url || 'https://api.openai.com/v1';
    const providerName = config.provider_name?.toLowerCase() || '';
    const modelName = config.model_name;

    let url: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: any;

    // Google Gemini
    if (providerName.includes('google') || providerName.includes('gemini') || baseUrl.includes('generativelanguage.googleapis.com')) {
      if (!decryptedApiKey) throw new Error('API key is required for Google Gemini');

      // Fix: Map to valid Gemini models (gemini-1.5-flash is deprecated, use gemini-2.5-flash)
      let finalModelName = modelName.trim().toLowerCase();

      // Map legacy/deprecated models to currently available ones
      const modelMap: Record<string, string> = {
        'gemini-pro': 'gemini-1.5-flash', // Legacy model -> use latest
        'gemini-1.5-flash': 'gemini-1.5-flash', // Current standard
        'gemini-1.5-pro': 'gemini-1.5-pro', // Keep pro as pro
        'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp', // Experimental
      };

      // Use mapped name or fallback to original (cleaned)
      finalModelName = modelMap[finalModelName] || finalModelName;

      // Ensure we use v1beta for Gemini
      // Handle both /v1 and /v1beta in baseUrl
      let geminiBaseUrl = baseUrl;
      if (baseUrl.includes('/v1') && !baseUrl.includes('/v1beta')) {
        geminiBaseUrl = baseUrl.replace('/v1', '/v1beta');
      } else if (!baseUrl.includes('/v1beta') && !baseUrl.includes('/v1')) {
        geminiBaseUrl = baseUrl.endsWith('/') ? `${baseUrl}v1beta` : `${baseUrl}/v1beta`;
      }

      url = `${geminiBaseUrl}/models/${finalModelName}:generateContent`;
      headers['x-goog-api-key'] = decryptedApiKey;

      body = JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`
          }]
        }]
      });
    }
    // Hugging Face
    else if (providerName.includes('hugging face') || baseUrl.includes('huggingface.co')) {
      if (!decryptedApiKey) throw new Error('API key is required for Hugging Face');
      url = `${baseUrl}/models/${modelName}`;
      headers['Authorization'] = `Bearer ${decryptedApiKey}`;
      body = JSON.stringify({
        inputs: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`,
        parameters: { max_new_tokens: config.max_tokens || 1000 }
      });
    }
    // Ollama (Local)
    else if (providerName.includes('ollama') || baseUrl.includes('localhost:11434')) {
      url = `${baseUrl}/chat/completions`;
      body = JSON.stringify({
        model: modelName,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        stream: false
      });
    }
    // OpenAI Compatible (Default)
    else {
      if (!decryptedApiKey) throw new Error('API key is required');
      url = `${baseUrl}/chat/completions`;
      headers['Authorization'] = `Bearer ${decryptedApiKey}`;
      body = JSON.stringify({
        model: modelName,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: config.max_tokens || 1000,
        temperature: config.temperature || 0.7,
      });
    }

    try {
      const response = await fetch(url, { method: 'POST', headers, body });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(JSON.stringify(errorData));
      }

      const data: any = await response.json();

      // Parse response
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content; // OpenAI/Ollama
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text; // Gemini
      if (data[0]?.generated_text) return data[0].generated_text; // Hugging Face
      if (data.response) return data.response; // Generic

      return JSON.stringify(data);
    } catch (error: any) {
      logger.error({
        message: 'AI Provider Call Failed',
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test connection to an AI provider
   */
  static async testConnection(configId: number): Promise<string> {
    const [configs] = await db.query('SELECT * FROM ai_api_configs WHERE id = ?', [configId]);
    const config = (configs as any[])[0];

    if (!config) throw new CustomError('Configuration not found', 404);

    return this.callProvider(config, 'Hello, this is a connection test. Please reply with "Connection Successful".');
  }

  /**
   * Generate a summary for a tender
   */
  static async generateTenderSummary(
    tender: any,
    documents?: Array<{ fileName: string; content: string }>
  ): Promise<string> {
    const config = await this.getDefaultConfig();

    const systemPrompt = `You are a professional tender analyst preparing an executive summary. Your output must be:
- Clean, professional, and easy to read
- Free of markdown formatting symbols (no **, *, #, etc.)
- Well-structured with clear sections
- Written in plain text format suitable for executives
- Focused on actionable insights

Format your response as plain text with clear section headers in ALL CAPS, bullet points using dashes, and proper spacing. Do not use markdown, asterisks, or special formatting characters.`;

    let userPrompt = `Please provide a comprehensive executive summary of the following tender opportunity:

TENDER OVERVIEW
Title: ${tender.title || 'N/A'}
Tender Number: ${tender.tender_number || 'N/A'}
Description: ${tender.description || 'N/A'}
Estimated Value: ${tender.currency || ''} ${tender.estimated_value || 'N/A'}
Submission Deadline: ${tender.submission_deadline || 'N/A'}
Category: ${tender.category_name || 'N/A'}
Company: ${tender.company_name || 'N/A'}
EMD Amount: ${tender.emd_amount || tender.emdAmount || 'N/A'}
Tender Fees: ${tender.tender_fees || tender.tenderFees || 'N/A'}`;

    // Include document content if available
    if (documents && documents.length > 0) {
      userPrompt += `\n\nATTACHED DOCUMENTS:\nThe following documents have been uploaded for this tender. Please analyze their content and include relevant information in your summary:\n\n`;

      documents.forEach((doc, index) => {
        // Limit document content to avoid token limits (first 5000 characters per document)
        const contentPreview = doc.content.length > 5000
          ? doc.content.substring(0, 5000) + '\n[... content truncated ...]'
          : doc.content;

        userPrompt += `Document ${index + 1}: ${doc.fileName}\n${contentPreview}\n\n---\n\n`;
      });
    }

    userPrompt += `\n\nPlease provide a comprehensive executive summary covering:
1. EXECUTIVE SUMMARY - Brief overview (2-3 sentences)
2. KEY REQUIREMENTS - Important requirements and specifications
3. FINANCIAL OVERVIEW - EMD, fees, estimated value, payment terms
4. TIMELINE & DEADLINES - Critical dates and milestones
5. ELIGIBILITY & QUALIFICATIONS - Required qualifications, certifications, experience
6. DOCUMENT HIGHLIGHTS - Key points from attached documents (if any)
7. RISK ASSESSMENT - Potential risks or concerns
8. RECOMMENDATION - Suggested action items

Format as plain text with section headers in ALL CAPS, use dashes for bullet points, and ensure proper spacing. Do not use markdown formatting.`;

    return this.callProvider(config, userPrompt, systemPrompt);
  }

  /**
   * Chat about a tender - answer questions using tender info and documents
   */
  static async chatAboutTender(
    tender: any,
    question: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    documentContent: string[] = []
  ): Promise<string> {
    const config = await this.getDefaultConfig();

    const systemPrompt = `You are a friendly and knowledgeable AI assistant specialized in analyzing tenders. Your role is to help users understand tender opportunities by answering questions in a conversational, engaging, and helpful manner.

Communication Style:
- Be warm, friendly, and approachable - like a knowledgeable colleague
- Use conversational language that's easy to understand
- Show enthusiasm about helping the user succeed
- Provide context and explain why information matters
- When appropriate, suggest follow-up questions or related topics
- Break down complex information into digestible parts
- Use natural transitions and connecting phrases

Response Guidelines:
- Always base answers on the provided tender information and documents
- If information is not available, acknowledge it clearly and suggest what might help
- Format responses with clear structure (use line breaks, bullet points with dashes)
- Do not use markdown formatting (no **, *, #, etc.)
- Keep responses concise but comprehensive - aim for 2-4 sentences per point
- End responses with a helpful question or suggestion when appropriate to keep the conversation engaging

Engagement Tips:
- Start responses with a brief acknowledgment when appropriate
- Highlight important details that might be easily missed
- Connect different pieces of information to provide insights
- Suggest actionable next steps when relevant
- Be encouraging and supportive`;

    // Build context from tender information
    let context = `TENDER INFORMATION:
Title: ${tender.title || 'N/A'}
Tender Number: ${tender.tender_number || 'N/A'}
Description: ${tender.description || 'N/A'}
Estimated Value: ${tender.currency || ''} ${tender.estimated_value || 'N/A'}
Submission Deadline: ${tender.submission_deadline || 'N/A'}
Expected Award Date: ${tender.expected_award_date || 'N/A'}
Category: ${tender.category_name || 'N/A'}
Company: ${tender.company_name || 'N/A'}
Status: ${tender.status || 'N/A'}
Priority: ${tender.priority || 'N/A'}
EMD Amount: ${tender.emd_amount || tender.emdAmount || 'N/A'}
Tender Fees: ${tender.tender_fees || tender.tenderFees || 'N/A'}
Contract Duration: ${tender.contract_duration_months || 'N/A'} months`;

    // Add document content
    if (documentContent && documentContent.length > 0) {
      context += `\n\nATTACHED DOCUMENTS:\nThe following documents are available for this tender:\n\n`;
      documentContent.forEach((content, index) => {
        // Limit each document to 3000 characters to avoid token limits
        const truncatedContent = content.length > 3000
          ? content.substring(0, 3000) + '\n[... content truncated ...]'
          : content;
        context += `Document ${index + 1}:\n${truncatedContent}\n\n---\n\n`;
      });
    }

    // Build messages array with chat history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the tender information and documents:\n\n${context}\n\nPlease answer the following question based on this information:` }
    ];

    // Add chat history (last 5 exchanges to keep context manageable)
    const recentHistory = chatHistory.slice(-5);
    recentHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Add current question
    messages.push({ role: 'user', content: question });

    // For OpenAI-compatible APIs, we can use the messages array directly
    // For others, we'll need to format differently
    const providerName = config.provider_name?.toLowerCase() || '';
    const baseUrl = config.base_url || 'https://api.openai.com/v1';

    // Check if it's Google Gemini (needs different format)
    if (providerName.includes('google') || providerName.includes('gemini') || baseUrl.includes('generativelanguage.googleapis.com')) {
      // For Gemini, combine messages into a single prompt
      const conversationText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = `${systemPrompt}\n\n${conversationText}`;
      return this.callProvider(config, fullPrompt, '');
    } else {
      // For OpenAI-compatible APIs, call with messages array
      return this.callProviderWithMessages(config, messages);
    }
  }
}
