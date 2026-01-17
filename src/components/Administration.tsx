import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  Settings,
  Mail,
  MessageSquare,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  Key,
  Bot,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
} from 'lucide-react';
import { sanitizeInput } from '../lib/security';
import { aiApi, adminApi } from '../lib/api';
import type { AIApiConfig } from '../lib/types';
import { ScoutSettings } from './ScoutSettings';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// AI Provider and Model Options
const AI_PROVIDERS = {
  // Free/Open Source Options
  'Hugging Face': {
    name: 'Hugging Face (Free)',
    defaultBaseUrl: 'https://api-inference.huggingface.co',
    models: [
      { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct' },
      { value: 'meta-llama/Llama-2-7b-chat-hf', label: 'Llama 2 7B Chat' },
      { value: 'google/flan-t5-large', label: 'Google Flan-T5 Large' },
      { value: 'microsoft/DialoGPT-large', label: 'Microsoft DialoGPT' },
      { value: 'bigscience/bloom-560m', label: 'BLOOM 560M' },
    ],
    isFree: true,
    note: 'Free tier available. Get API key from huggingface.co',
  },
  'Groq': {
    name: 'Groq (Free Tier)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Fast!)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma-7b-it', label: 'Gemma 7B IT' },
    ],
    isFree: true,
    note: 'Very fast inference. Free tier with generous limits. Get API key from groq.com',
  },
  'Together AI': {
    name: 'Together AI (Free Tier)',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    models: [
      { value: 'meta-llama/Llama-2-70b-chat-hf', label: 'Llama 2 70B Chat' },
      { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B Instruct' },
      { value: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO', label: 'Nous Hermes 2' },
      { value: 'teknium/OpenHermes-2.5-Mistral-7B', label: 'OpenHermes 2.5' },
    ],
    isFree: true,
    note: 'Free tier available. Get API key from together.ai',
  },
  'Ollama (Local)': {
    name: 'Ollama (Local - Free)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [
      { value: 'llama2', label: 'Llama 2' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'phi', label: 'Phi' },
      { value: 'neural-chat', label: 'Neural Chat' },
    ],
    isFree: true,
    note: 'Runs locally on your server. Install Ollama first. No API key needed (leave blank).',
  },
  'Google Gemini': {
    name: 'Google Gemini (Free Tier)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Latest - Recommended)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Deprecated - will use 2.5-flash)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Deprecated - will use 2.5-flash)' },
      { value: 'gemini-pro', label: 'Gemini Pro (Legacy - will use 2.5-flash)' },
    ],
    isFree: true,
    note: 'Free tier available. Get API key from Google AI Studio. API key is sent in x-goog-api-key header. Note: Legacy models (1.5-flash, 1.5-pro, gemini-pro) are automatically upgraded to gemini-2.5-flash.',
  },
  'Mistral AI': {
    name: 'Mistral AI (Free Tier)',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    models: [
      { value: 'mistral-tiny', label: 'Mistral Tiny (Free)' },
      { value: 'mistral-small', label: 'Mistral Small' },
      { value: 'mistral-medium', label: 'Mistral Medium' },
    ],
    isFree: true,
    note: 'Free tier available. Get API key from mistral.ai',
  },
  // Paid Options
  'OpenAI': {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k' },
    ],
    isFree: false,
  },
  'Anthropic': {
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    isFree: false,
  },
  'Cohere': {
    name: 'Cohere',
    defaultBaseUrl: 'https://api.cohere.ai/v1',
    models: [
      { value: 'command', label: 'Command' },
      { value: 'command-light', label: 'Command Light' },
    ],
    isFree: false,
  },
  'Custom': {
    name: 'Custom',
    defaultBaseUrl: '',
    models: [],
    isFree: false,
  },
} as const;

export function Administration() {
  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    fromEmail: '',
    fromName: '',
    apiKey: '',
    apiProvider: 'sendgrid',
    isEnabled: true,
  });

  const [smsConfig, setSmsConfig] = useState({
    provider: 'twilio',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    apiKey: '',
    apiSecret: '',
    senderId: '',
    isEnabled: false,
  });

  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'email' | 'sms' | null;
    status: 'success' | 'error' | null;
    message: string;
  }>({ type: null, status: null, message: '' });

  // AI Settings state
  const [aiConfigs, setAiConfigs] = useState<AIApiConfig[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [editingAiConfig, setEditingAiConfig] = useState<AIApiConfig | null>(null);
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiFormErrors, setAiFormErrors] = useState<Record<string, string>>({});
  const [aiFormData, setAiFormData] = useState({
    providerName: '',
    modelName: '',
    apiKey: '',
    baseUrl: '',
    isActive: true,
    isDefault: false,
    maxTokens: 2000,
    temperature: 0.7,
    description: '',
  });

  const handleSaveEmailConfig = async () => {
    // Sanitize inputs
    const sanitized = {
      ...emailConfig,
      smtpHost: sanitizeInput(emailConfig.smtpHost),
      smtpUsername: sanitizeInput(emailConfig.smtpUsername),
      fromEmail: sanitizeInput(emailConfig.fromEmail),
      fromName: sanitizeInput(emailConfig.fromName),
    };

    try {
      const response = await adminApi.updateConfig('email_config', JSON.stringify(sanitized), 'json');
      if (response.success) {
        alert('Email configuration saved successfully!');
      } else {
        alert(`Failed to save configuration: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error saving email config:', err);
      alert(`Error saving configuration: ${err.message}`);
    }
  };

  const handleSaveSmsConfig = async () => {
    // Sanitize inputs
    const sanitized = {
      ...smsConfig,
      senderId: sanitizeInput(smsConfig.senderId),
      twilioPhoneNumber: sanitizeInput(smsConfig.twilioPhoneNumber),
    };

    try {
      const response = await adminApi.updateConfig('sms_config', JSON.stringify(sanitized), 'json');
      if (response.success) {
        alert('SMS configuration saved successfully!');
      } else {
        alert(`Failed to save configuration: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error saving SMS config:', err);
      alert(`Error saving configuration: ${err.message}`);
    }
  };

  const handleTestEmail = async () => {
    if (!emailConfig.fromEmail) {
      setTestStatus({ type: 'email', status: 'error', message: 'From Email is required to test.' });
      return;
    }
    setTestStatus({ type: 'email', status: null, message: 'Sending test email...' });

    try {
      // Use the fromEmail as the recipient for the test
      const response = await adminApi.testEmail(emailConfig.fromEmail);
      if (response.success) {
        setTestStatus({
          type: 'email',
          status: 'success',
          message: 'Test email sent successfully! Check your inbox.',
        });
      } else {
        setTestStatus({
          type: 'email',
          status: 'error',
          message: response.error || 'Failed to send test email',
        });
      }
    } catch (err: any) {
      setTestStatus({
        type: 'email',
        status: 'error',
        message: err.message || 'Error sending test email',
      });
    }
  };

  // Data Fetching
  useEffect(() => {
    fetchSystemConfigs();
    fetchAiConfigs();
  }, []);

  const fetchSystemConfigs = async () => {
    try {
      const response = await adminApi.getConfig();
      if (response.success && response.data) {
        const configs = response.data;

        // Parse Email Config
        const emailConf = configs.find(c => c.configKey === 'email_config');
        if (emailConf && emailConf.configValue) {
          try {
            const parsed = JSON.parse(emailConf.configValue);
            // Merge with default state to ensure all fields exist
            setEmailConfig(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('Failed to parse email config:', e);
          }
        }

        // Parse SMS Config
        const smsConf = configs.find(c => c.configKey === 'sms_config');
        if (smsConf && smsConf.configValue) {
          try {
            const parsed = JSON.parse(smsConf.configValue);
            // Merge with default state
            setSmsConfig(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('Failed to parse SMS config:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching system configs:', err);
    }
  };

  // Auto-show form if no configurations exist
  useEffect(() => {
    if (!aiLoading && aiConfigs.length === 0 && !showAiForm) {
      // Don't auto-show, let user click the button
    }
  }, [aiLoading, aiConfigs.length, showAiForm]);

  const fetchAiConfigs = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      const response = await aiApi.getAll();
      if (response.success && response.data) {
        setAiConfigs(response.data);
      } else {
        setAiError(response.error || 'Failed to load AI configurations');
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to load AI configurations');
    } finally {
      setAiLoading(false);
    }
  };

  const validateAiForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!aiFormData.providerName.trim()) {
      errors.providerName = 'Provider name is required';
    }

    if (!aiFormData.modelName.trim()) {
      errors.modelName = 'Model name is required';
    }

    // API key is optional for Ollama (local)
    if (!editingAiConfig && !aiFormData.apiKey.trim() && aiFormData.providerName !== 'Ollama (Local)') {
      errors.apiKey = 'API key is required for new configurations';
    }

    if (aiFormData.baseUrl && !/^https?:\/\/.+\..+/.test(aiFormData.baseUrl)) {
      errors.baseUrl = 'Please enter a valid URL (e.g., https://api.openai.com/v1)';
    }

    if (aiFormData.maxTokens < 1 || aiFormData.maxTokens > 100000) {
      errors.maxTokens = 'Max tokens must be between 1 and 100,000';
    }

    if (aiFormData.temperature < 0 || aiFormData.temperature > 2) {
      errors.temperature = 'Temperature must be between 0 and 2';
    }

    setAiFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAiForm = async (config?: AIApiConfig) => {
    if (config) {
      // Fetch fresh data from API to ensure we have the latest
      try {
        const response = await aiApi.getById(config.id);
        if (response.success && response.data) {
          setEditingAiConfig(response.data);
          setAiFormData({
            providerName: response.data.providerName,
            modelName: response.data.modelName,
            apiKey: '', // Don't show existing API key
            baseUrl: response.data.baseUrl || '',
            isActive: response.data.isActive,
            isDefault: response.data.isDefault,
            maxTokens: response.data.maxTokens,
            temperature: response.data.temperature,
            description: response.data.description || '',
          });
        } else {
          // Fallback to provided config if API call fails
          setEditingAiConfig(config);
          setAiFormData({
            providerName: config.providerName,
            modelName: config.modelName,
            apiKey: '',
            baseUrl: config.baseUrl || '',
            isActive: config.isActive,
            isDefault: config.isDefault,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            description: config.description || '',
          });
        }
      } catch (err) {
        // Fallback to provided config
        setEditingAiConfig(config);
        setAiFormData({
          providerName: config.providerName,
          modelName: config.modelName,
          apiKey: '',
          baseUrl: config.baseUrl || '',
          isActive: config.isActive,
          isDefault: config.isDefault,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          description: config.description || '',
        });
      }
    } else {
      setEditingAiConfig(null);
      setAiFormData({
        providerName: '',
        modelName: '',
        apiKey: '',
        baseUrl: '',
        isActive: true,
        isDefault: false,
        maxTokens: 2000,
        temperature: 0.7,
        description: '',
      });
    }
    setShowAiForm(true);
    setAiError(null);
    setAiFormErrors({});
  };

  const handleCloseAiForm = () => {
    setShowAiForm(false);
    setEditingAiConfig(null);
    setAiFormData({
      providerName: '',
      modelName: '',
      apiKey: '',
      baseUrl: '',
      isActive: true,
      isDefault: false,
      maxTokens: 2000,
      temperature: 0.7,
      description: '',
    });
    setAiError(null);
    setAiFormErrors({});
  };

  const handleSubmitAi = async () => {
    // Clear previous errors
    setAiError(null);
    setAiFormErrors({});

    // Validate form
    if (!validateAiForm()) {
      setAiError('Please fix the errors in the form');
      return;
    }

    try {
      setAiSaving(true);
      setAiSuccess(null);

      let response;
      if (editingAiConfig) {
        const updateData: any = {
          providerName: aiFormData.providerName.trim(),
          modelName: aiFormData.modelName.trim(),
          baseUrl: aiFormData.baseUrl.trim() || undefined,
          isActive: aiFormData.isActive,
          isDefault: aiFormData.isDefault,
          maxTokens: aiFormData.maxTokens,
          temperature: aiFormData.temperature,
          description: aiFormData.description.trim() || undefined,
        };
        // Only include API key if it was provided
        if (aiFormData.apiKey.trim()) {
          updateData.apiKey = aiFormData.apiKey.trim();
        }
        response = await aiApi.update(editingAiConfig.id, updateData);
      } else {
        response = await aiApi.create({
          providerName: aiFormData.providerName.trim(),
          modelName: aiFormData.modelName.trim(),
          apiKey: aiFormData.apiKey.trim(),
          baseUrl: aiFormData.baseUrl.trim() || undefined,
          isActive: aiFormData.isActive,
          isDefault: aiFormData.isDefault,
          maxTokens: aiFormData.maxTokens,
          temperature: aiFormData.temperature,
          description: aiFormData.description.trim() || undefined,
        });
      }

      if (response.success) {
        setAiSuccess(editingAiConfig ? 'AI configuration updated successfully' : 'AI configuration created successfully');
        setTimeout(() => setAiSuccess(null), 5000);
        handleCloseAiForm();
        // Refresh the list
        await fetchAiConfigs();
      } else {
        setAiError(response.error || 'Failed to save AI configuration');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save AI configuration';
      setAiError(errorMessage);

      // Try to parse API error response for field-specific errors
      if (err.response?.data?.errors) {
        setAiFormErrors(err.response.data.errors);
      }
    } finally {
      setAiSaving(false);
    }
  };

  const handleDeleteAi = async (id: number) => {
    const config = aiConfigs.find(c => c.id === id);
    const configName = config ? `${config.providerName} - ${config.modelName}` : 'this configuration';

    if (!confirm(`Are you sure you want to delete ${configName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setAiError(null);
      setAiSuccess(null);
      const response = await aiApi.delete(id);
      if (response.success) {
        setAiSuccess('AI configuration deleted successfully');
        setTimeout(() => setAiSuccess(null), 3000);
        // If we were editing the deleted config, close the form
        if (editingAiConfig?.id === id) {
          handleCloseAiForm();
        }
        await fetchAiConfigs();
      } else {
        setAiError(response.error || 'Failed to delete AI configuration');
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to delete AI configuration');
    }
  };

  const handleTestAi = async (id: number) => {
    try {
      setAiTesting(id);
      setAiError(null);
      setAiSuccess(null);
      const response = await aiApi.test(id);
      if (response.success) {
        setAiSuccess(`✅ API test successful: ${response.data?.response || 'Connection verified'}`);
        setTimeout(() => setAiSuccess(null), 5000);
      } else {
        // Check if connection is working but there's a quota/billing issue
        const errorData = response as any;
        if (errorData.isConnectionWorking) {
          setAiSuccess(`⚠️ Connection verified, but: ${response.error || 'API test failed'}`);
          setTimeout(() => setAiSuccess(null), 8000);
        } else {
          setAiError(response.error || 'API test failed');
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'API test failed';
      // Check if it's a quota/billing error (connection working)
      if (errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('billing') ||
        errorMessage.toLowerCase().includes('exceeded')) {
        setAiSuccess(`⚠️ Connection verified, but your API account has exceeded its quota. Please check your billing.`);
        setTimeout(() => setAiSuccess(null), 8000);
      } else {
        setAiError(errorMessage);
      }
    } finally {
      setAiTesting(null);
    }
  };

  const handleTestAiForm = async () => {
    // Validate form first
    if (!validateAiForm()) {
      setAiError('Please fix the errors in the form before testing');
      return;
    }

    // Check if we have an API key
    if (!editingAiConfig && !aiFormData.apiKey.trim()) {
      setAiError('API key is required to test the connection');
      return;
    }

    // If editing, test using existing saved config
    if (editingAiConfig) {
      await handleTestAi(editingAiConfig.id);
    } else {
      // For new configs, save first then test
      setAiError(null);
      setAiSuccess('Saving configuration first, then testing...');

      try {
        setAiSaving(true);
        const response = await aiApi.create({
          providerName: aiFormData.providerName.trim(),
          modelName: aiFormData.modelName.trim(),
          apiKey: aiFormData.apiKey.trim(),
          baseUrl: aiFormData.baseUrl.trim() || undefined,
          isActive: aiFormData.isActive,
          isDefault: aiFormData.isDefault,
          maxTokens: aiFormData.maxTokens,
          temperature: aiFormData.temperature,
          description: aiFormData.description.trim() || undefined,
        });

        if (response.success && response.data) {
          // Refresh list and test the newly created config
          await fetchAiConfigs();
          await handleTestAi(response.data.id);
          setAiSuccess('Configuration saved and tested successfully!');
          setTimeout(() => setAiSuccess(null), 5000);
        } else {
          setAiError(response.error || 'Failed to save configuration');
        }
      } catch (err: any) {
        setAiError(err.message || 'Failed to save configuration');
      } finally {
        setAiSaving(false);
      }
    }
  };

  const getAvailableModels = () => {
    const provider = aiFormData.providerName as keyof typeof AI_PROVIDERS;
    if (provider && AI_PROVIDERS[provider]) {
      return AI_PROVIDERS[provider].models;
    }
    return [];
  };

  const handleProviderChange = (provider: string) => {
    const providerConfig = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
    setAiFormData({
      ...aiFormData,
      providerName: provider,
      modelName: '', // Reset model when provider changes
      baseUrl: providerConfig?.defaultBaseUrl || '',
    });
    if (aiFormErrors.providerName) {
      setAiFormErrors({ ...aiFormErrors, providerName: '' });
    }
  };

  const handleTestSms = async () => {
    if (!smsConfig.twilioPhoneNumber) {
      setTestStatus({ type: 'sms', status: 'error', message: 'Twilio Phone Number is required to test.' });
      return;
    }
    setTestStatus({ type: 'sms', status: null, message: 'Sending test SMS...' });

    try {
      // Use the generic test endpoint (which likely sends to a predefined admin number or we need an input)
      // For now, we'll try sending to the verified sender ID/phone itself if it's a mobile, 
      // or effectively we might need a separate input for "Test Phone Number".
      // The adminApi.testSMS takes `phoneNumber`.
      const response = await adminApi.testSMS(smsConfig.twilioPhoneNumber);

      if (response.success) {
        setTestStatus({
          type: 'sms',
          status: 'success',
          message: 'Test SMS sent successfully!',
        });
      } else {
        setTestStatus({
          type: 'sms',
          status: 'error',
          message: response.error || 'Failed to send test SMS',
        });
      }
    } catch (err: any) {
      setTestStatus({
        type: 'sms',
        status: 'error',
        message: err.message || 'Error sending test SMS',
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-gray-900" aria-hidden="true" />
              Administration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Email and SMS API settings for notifications
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-900 border border-gray-200">
            <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
            Admin Only
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Security Notice */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Security Notice:</strong> All API credentials are encrypted
                  before being stored in the database. Never share these credentials
                  or commit them to version control.
                </p>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="email" className="w-full">
            <TabsList>
              <TabsTrigger value="email">
                <Mail className="w-4 h-4" aria-hidden="true" />
                Email Configuration
              </TabsTrigger>
              <TabsTrigger value="sms">
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                SMS Configuration
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Bot className="w-4 h-4" aria-hidden="true" />
                AI Settings
              </TabsTrigger>
              <TabsTrigger value="scout">
                <Search className="w-4 h-4" aria-hidden="true" />
                Scout Settings
              </TabsTrigger>
            </TabsList>

            {/* Email Configuration Tab */}
            <TabsContent value="email" className="space-y-6 mt-6">
              {/* Enable/Disable */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable email notifications system-wide
                    </p>
                  </div>
                  <Switch
                    checked={emailConfig.isEnabled}
                    onCheckedChange={(checked) =>
                      setEmailConfig({ ...emailConfig, isEnabled: checked })
                    }
                    aria-label="Enable email notifications"
                  />
                </div>
              </Card>

              {/* Provider Selection */}
              <Card className="p-6">
                <h3 className="mb-4">Email Provider</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-provider">
                      Select Provider <span className="text-red-600" aria-label="required">*</span>
                    </Label>
                    <select
                      id="email-provider"
                      className="w-full border rounded-md px-3 py-2"
                      value={emailConfig.provider}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, provider: e.target.value })
                      }
                      aria-required="true"
                    >
                      <option value="smtp">SMTP Server</option>
                      <option value="sendgrid">SendGrid API</option>
                      <option value="mailgun">Mailgun API</option>
                      <option value="ses">AWS SES</option>
                    </select>
                  </div>

                  {emailConfig.provider === 'smtp' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-host">
                            SMTP Host <span className="text-red-600" aria-label="required">*</span>
                          </Label>
                          <Input
                            id="smtp-host"
                            placeholder="smtp.gmail.com"
                            value={emailConfig.smtpHost}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                            }
                            aria-required="true"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-port">
                            SMTP Port <span className="text-red-600" aria-label="required">*</span>
                          </Label>
                          <Input
                            id="smtp-port"
                            type="number"
                            placeholder="587"
                            value={emailConfig.smtpPort}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
                            }
                            aria-required="true"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-username">
                          SMTP Username <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="smtp-username"
                          type="email"
                          placeholder="your-email@gmail.com"
                          value={emailConfig.smtpUsername}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpUsername: e.target.value })
                          }
                          autoComplete="username"
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-password">
                          SMTP Password <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="smtp-password"
                            type={showEmailPassword ? 'text' : 'password'}
                            placeholder="Enter SMTP password or app password"
                            value={emailConfig.smtpPassword}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })
                            }
                            autoComplete="current-password"
                            aria-required="true"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                          >
                            {showEmailPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-encryption">Encryption Method</Label>
                        <select
                          id="smtp-encryption"
                          className="w-full border rounded-md px-3 py-2"
                          value={emailConfig.smtpEncryption}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpEncryption: e.target.value })
                          }
                        >
                          <option value="tls">TLS</option>
                          <option value="ssl">SSL</option>
                          <option value="none">None (Not Recommended)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="flex items-center gap-2">
                        <Key className="w-4 h-4" aria-hidden="true" />
                        API Key <span className="text-red-600" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder={`Enter your ${emailConfig.provider} API key`}
                        value={emailConfig.apiKey}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, apiKey: e.target.value })
                        }
                        aria-required="true"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API key from your {emailConfig.provider} dashboard
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-email">
                        From Email Address <span className="text-red-600" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="from-email"
                        type="email"
                        placeholder="noreply@yourcompany.com"
                        value={emailConfig.fromEmail}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                        }
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">From Name</Label>
                      <Input
                        id="from-name"
                        placeholder="LeadTrack Pro"
                        value={emailConfig.fromName}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, fromName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Test & Save */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEmailConfig}>
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={handleTestEmail}>
                      <TestTube className="w-4 h-4 mr-2" aria-hidden="true" />
                      Send Test Email
                    </Button>
                  </div>
                </div>
                {testStatus.type === 'email' && testStatus.message && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testStatus.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                      }`}
                    role="status"
                    aria-live="polite"
                  >
                    {testStatus.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    )}
                    <p className={`text-sm ${testStatus.status === 'success' ? 'text-green-800' : 'text-blue-800'
                      }`}>
                      {testStatus.message}
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* SMS Configuration Tab */}
            <TabsContent value="sms" className="space-y-6 mt-6">
              {/* Enable/Disable */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1">SMS Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable SMS notifications system-wide
                    </p>
                  </div>
                  <Switch
                    checked={smsConfig.isEnabled}
                    onCheckedChange={(checked) =>
                      setSmsConfig({ ...smsConfig, isEnabled: checked })
                    }
                    aria-label="Enable SMS notifications"
                  />
                </div>
              </Card>

              {/* Provider Selection */}
              <Card className="p-6">
                <h3 className="mb-4">SMS Provider</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">
                      Select Provider <span className="text-red-600" aria-label="required">*</span>
                    </Label>
                    <select
                      id="sms-provider"
                      className="w-full border rounded-md px-3 py-2"
                      value={smsConfig.provider}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, provider: e.target.value })
                      }
                      aria-required="true"
                    >
                      <option value="twilio">Twilio</option>
                      <option value="nexmo">Vonage (Nexmo)</option>
                      <option value="aws-sns">AWS SNS</option>
                      <option value="msg91">MSG91</option>
                    </select>
                  </div>

                  {smsConfig.provider === 'twilio' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="twilio-sid">
                          Account SID <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="twilio-sid"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={smsConfig.twilioAccountSid}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, twilioAccountSid: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twilio-token">
                          Auth Token <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="twilio-token"
                            type={showSmsToken ? 'text' : 'password'}
                            placeholder="Enter Twilio Auth Token"
                            value={smsConfig.twilioAuthToken}
                            onChange={(e) =>
                              setSmsConfig({ ...smsConfig, twilioAuthToken: e.target.value })
                            }
                            aria-required="true"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmsToken(!showSmsToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            aria-label={showSmsToken ? 'Hide token' : 'Show token'}
                          >
                            {showSmsToken ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twilio-phone">
                          Twilio Phone Number <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="twilio-phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={smsConfig.twilioPhoneNumber}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, twilioPhoneNumber: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sms-api-key">
                          API Key <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="sms-api-key"
                          type="password"
                          placeholder={`Enter your ${smsConfig.provider} API key`}
                          value={smsConfig.apiKey}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, apiKey: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sms-api-secret">API Secret</Label>
                        <Input
                          id="sms-api-secret"
                          type="password"
                          placeholder="Enter API secret (if required)"
                          value={smsConfig.apiSecret}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, apiSecret: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sender-id">Sender ID / From Number</Label>
                    <Input
                      id="sender-id"
                      placeholder="LEADTRACK or +1234567890"
                      value={smsConfig.senderId}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, senderId: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Alphanumeric sender ID or verified phone number
                    </p>
                  </div>
                </div>
              </Card>

              {/* Test & Save */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSmsConfig}>
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={handleTestSms}>
                      <TestTube className="w-4 h-4 mr-2" aria-hidden="true" />
                      Send Test SMS
                    </Button>
                  </div>
                </div>
                {testStatus.type === 'sms' && testStatus.message && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testStatus.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                      }`}
                    role="status"
                    aria-live="polite"
                  >
                    {testStatus.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    )}
                    <p className={`text-sm ${testStatus.status === 'success' ? 'text-green-800' : 'text-blue-800'
                      }`}>
                      {testStatus.message}
                    </p>
                  </div>
                )}
              </Card>

              {/* SMS Best Practices */}
              <Card className="p-6 bg-amber-50 border-amber-200">
                <h4 className="mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  SMS Best Practices
                </h4>
                <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
                  <li>Only send SMS for critical notifications</li>
                  <li>Obtain user consent before sending SMS</li>
                  <li>Include opt-out instructions in messages</li>
                  <li>Monitor delivery rates and costs</li>
                  <li>Comply with local telecommunications regulations</li>
                </ul>
              </Card>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="ai" className="space-y-6 mt-6">
              {/* Error/Success Messages */}
              {aiError && (
                <Card className="p-4 bg-red-50 border-red-200">
                  <p className="text-red-800 text-sm">{aiError}</p>
                </Card>
              )}
              {aiSuccess && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-green-800 text-sm">{aiSuccess}</p>
                </Card>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold">AI API Configurations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure AI APIs (ChatGPT, Anthropic, etc.) for document summarization and tender format generation.
                </p>
              </div>

              {/* AI Configuration Form */}
              {showAiForm && (
                <Card className="p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold">
                      {editingAiConfig ? 'Edit AI Configuration' : 'Add AI Configuration'}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={handleCloseAiForm}>
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ai-providerName">
                          Provider Name <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={aiFormData.providerName}
                          onValueChange={handleProviderChange}
                        >
                          <SelectTrigger
                            id="ai-providerName"
                            className={aiFormErrors.providerName ? 'border-red-500' : ''}
                          >
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__free_header" disabled className="font-semibold text-xs text-muted-foreground">
                              🆓 Free Options
                            </SelectItem>
                            {Object.keys(AI_PROVIDERS)
                              .filter(p => AI_PROVIDERS[p as keyof typeof AI_PROVIDERS].isFree)
                              .map((provider) => (
                                <SelectItem key={provider} value={provider}>
                                  {AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].name}
                                </SelectItem>
                              ))}
                            <SelectItem value="__paid_header" disabled className="font-semibold text-xs text-muted-foreground mt-2">
                              💰 Paid Options
                            </SelectItem>
                            {Object.keys(AI_PROVIDERS)
                              .filter(p => !AI_PROVIDERS[p as keyof typeof AI_PROVIDERS].isFree)
                              .map((provider) => (
                                <SelectItem key={provider} value={provider}>
                                  {AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {aiFormErrors.providerName && (
                          <p className="text-xs text-red-600">{aiFormErrors.providerName}</p>
                        )}
                        {!aiFormErrors.providerName && aiFormData.providerName && (
                          <div className="space-y-1">
                            {AI_PROVIDERS[aiFormData.providerName as keyof typeof AI_PROVIDERS]?.defaultBaseUrl && (
                              <p className="text-xs text-muted-foreground">
                                Default URL: {AI_PROVIDERS[aiFormData.providerName as keyof typeof AI_PROVIDERS].defaultBaseUrl}
                              </p>
                            )}
                            {AI_PROVIDERS[aiFormData.providerName as keyof typeof AI_PROVIDERS]?.note && (
                              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                💡 {AI_PROVIDERS[aiFormData.providerName as keyof typeof AI_PROVIDERS].note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ai-modelName">
                          Model Name <span className="text-red-500">*</span>
                        </Label>
                        {getAvailableModels().length > 0 ? (
                          <Select
                            value={aiFormData.modelName}
                            onValueChange={(value) => {
                              setAiFormData({ ...aiFormData, modelName: value });
                              if (aiFormErrors.modelName) {
                                setAiFormErrors({ ...aiFormErrors, modelName: '' });
                              }
                            }}
                            disabled={!aiFormData.providerName}
                          >
                            <SelectTrigger
                              id="ai-modelName"
                              className={aiFormErrors.modelName ? 'border-red-500' : ''}
                            >
                              <SelectValue placeholder={aiFormData.providerName ? "Select a model" : "Select provider first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableModels().map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="ai-modelName"
                            value={aiFormData.modelName}
                            onChange={(e) => {
                              setAiFormData({ ...aiFormData, modelName: e.target.value });
                              if (aiFormErrors.modelName) {
                                setAiFormErrors({ ...aiFormErrors, modelName: '' });
                              }
                            }}
                            placeholder="Enter model name (for custom providers)"
                            className={aiFormErrors.modelName ? 'border-red-500' : ''}
                            disabled={!aiFormData.providerName}
                          />
                        )}
                        {aiFormErrors.modelName && (
                          <p className="text-xs text-red-600">{aiFormErrors.modelName}</p>
                        )}
                        {!aiFormErrors.modelName && aiFormData.providerName && getAvailableModels().length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Enter the model name for your custom provider
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-apiKey">
                        API Key {!editingAiConfig && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="ai-apiKey"
                        type="password"
                        value={aiFormData.apiKey}
                        onChange={(e) => {
                          setAiFormData({ ...aiFormData, apiKey: e.target.value });
                          if (aiFormErrors.apiKey) {
                            setAiFormErrors({ ...aiFormErrors, apiKey: '' });
                          }
                        }}
                        placeholder={editingAiConfig ? "Leave blank to keep existing key" : "Enter API key"}
                        className={aiFormErrors.apiKey ? 'border-red-500' : ''}
                      />
                      {aiFormErrors.apiKey && (
                        <p className="text-xs text-red-600">{aiFormErrors.apiKey}</p>
                      )}
                      {editingAiConfig && !aiFormErrors.apiKey && (
                        <p className="text-xs text-muted-foreground">
                          Leave blank to keep the existing API key
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-baseUrl">Base URL (Optional)</Label>
                      <Input
                        id="ai-baseUrl"
                        type="url"
                        value={aiFormData.baseUrl}
                        onChange={(e) => {
                          setAiFormData({ ...aiFormData, baseUrl: e.target.value });
                          if (aiFormErrors.baseUrl) {
                            setAiFormErrors({ ...aiFormErrors, baseUrl: '' });
                          }
                        }}
                        placeholder="https://api.openai.com/v1"
                        className={aiFormErrors.baseUrl ? 'border-red-500' : ''}
                      />
                      {aiFormErrors.baseUrl && (
                        <p className="text-xs text-red-600">{aiFormErrors.baseUrl}</p>
                      )}
                      {!aiFormErrors.baseUrl && (
                        <p className="text-xs text-muted-foreground">
                          Leave empty to use the default API endpoint for the provider
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ai-maxTokens">Max Tokens</Label>
                        <Input
                          id="ai-maxTokens"
                          type="number"
                          min="1"
                          max="100000"
                          value={aiFormData.maxTokens}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 2000;
                            setAiFormData({ ...aiFormData, maxTokens: value });
                            if (aiFormErrors.maxTokens) {
                              setAiFormErrors({ ...aiFormErrors, maxTokens: '' });
                            }
                          }}
                          className={aiFormErrors.maxTokens ? 'border-red-500' : ''}
                        />
                        {aiFormErrors.maxTokens && (
                          <p className="text-xs text-red-600">{aiFormErrors.maxTokens}</p>
                        )}
                        {!aiFormErrors.maxTokens && (
                          <p className="text-xs text-muted-foreground">
                            Maximum number of tokens in the response (1-100,000)
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ai-temperature">Temperature (0-2)</Label>
                        <Input
                          id="ai-temperature"
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={aiFormData.temperature}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0.7;
                            setAiFormData({ ...aiFormData, temperature: value });
                            if (aiFormErrors.temperature) {
                              setAiFormErrors({ ...aiFormErrors, temperature: '' });
                            }
                          }}
                          className={aiFormErrors.temperature ? 'border-red-500' : ''}
                        />
                        {aiFormErrors.temperature && (
                          <p className="text-xs text-red-600">{aiFormErrors.temperature}</p>
                        )}
                        {!aiFormErrors.temperature && (
                          <p className="text-xs text-muted-foreground">
                            Controls randomness: 0 = deterministic, 2 = very creative
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-description">Description (Optional)</Label>
                      <Textarea
                        id="ai-description"
                        value={aiFormData.description}
                        onChange={(e) => setAiFormData({ ...aiFormData, description: e.target.value })}
                        placeholder="Description of this AI configuration"
                        rows={3}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ai-isActive"
                            checked={aiFormData.isActive}
                            onCheckedChange={(checked) => setAiFormData({ ...aiFormData, isActive: checked })}
                          />
                          <Label htmlFor="ai-isActive">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ai-isDefault"
                            checked={aiFormData.isDefault}
                            onCheckedChange={(checked) => setAiFormData({ ...aiFormData, isDefault: checked })}
                          />
                          <Label htmlFor="ai-isDefault">Set as Default</Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleTestAiForm}
                          disabled={aiSaving || (!editingAiConfig && !aiFormData.apiKey.trim()) || !aiFormData.providerName || !aiFormData.modelName}
                          type="button"
                        >
                          {aiSaving && !editingAiConfig ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving & Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="w-4 h-4 mr-2" />
                              {editingAiConfig ? 'Test Connection' : 'Save & Test'}
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleCloseAiForm} disabled={aiSaving}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmitAi} disabled={aiSaving}>
                          {aiSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : editingAiConfig ? 'Update' : 'Create'}
                        </Button>
                      </div>
                      {!editingAiConfig && !aiFormData.apiKey.trim() && (
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Enter an API key to enable testing. The "Save & Test" button will save the configuration and immediately test the connection.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Show "Add New" button when form is not visible */}
              {!showAiForm && (
                <div className="mb-4">
                  <Button onClick={() => handleOpenAiForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add AI Configuration
                  </Button>
                </div>
              )}

              <Card className="p-6">
                {aiLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-4 text-muted-foreground">Loading AI configurations...</p>
                    </div>
                  </div>
                ) : aiConfigs.length === 0 && !showAiForm ? (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-muted-foreground mb-4">No AI configurations found. Add one to get started.</p>
                    <Button onClick={() => handleOpenAiForm()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First AI Configuration
                    </Button>
                  </div>
                ) : aiConfigs.length === 0 && showAiForm ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      Fill out the form above to create your first AI configuration.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Base URL</TableHead>
                        <TableHead>Max Tokens</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.providerName}</TableCell>
                          <TableCell>{config.modelName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {config.baseUrl || 'Default'}
                          </TableCell>
                          <TableCell>{config.maxTokens}</TableCell>
                          <TableCell>{config.temperature}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {config.isActive && (
                                <Badge variant="default">Active</Badge>
                              )}
                              {!config.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {config.isDefault && (
                                <Badge variant="outline">Default</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestAi(config.id)}
                                disabled={aiTesting === config.id}
                              >
                                {aiTesting === config.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <TestTube className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenAiForm(config)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAi(config.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            {/* Scout Settings Tab */}
            <TabsContent value="scout" className="space-y-6 mt-6">
              <ScoutSettings />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
