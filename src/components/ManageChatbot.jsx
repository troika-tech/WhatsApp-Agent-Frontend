import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSpinner,
  FaRobot,
  FaPlus,
  FaCog,
  FaUser,
  FaFileAlt,
  FaUpload,
  FaTrash,
  FaPowerOff,
  FaRedo,
  FaComments,
  FaBrain,
  FaTimes,
  FaCheck,
  FaToggleOn,
  FaToggleOff,
  FaExclamationTriangle,
  FaMagic,
 FaEye,
 FaEyeSlash, 
 FaLink,
FaCheckCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import api, { zohoAPI } from '../services/api';
const ManageChatbot = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [chatbotAccounts, setChatbotAccounts] = useState([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingChatbotId, setTogglingChatbotId] = useState(null);

  // Global toggle state
  const [globalToggling, setGlobalToggling] = useState(false);
  const [toggleProgress, setToggleProgress] = useState({
    current: 0,
    total: 0,
  });

  // Auto-chat state
  const [autoChatEnabled, setAutoChatEnabled] = useState(false);
  const [autoChatLoading, setAutoChatLoading] = useState(false);
  const [showAutoChatDialog, setShowAutoChatDialog] = useState(false);
  const [autoChatTopic, setAutoChatTopic] = useState("");
  const [currentAutoChatTopic, setCurrentAutoChatTopic] = useState("");

  // Add Chatbot Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [addingChatbot, setAddingChatbot] = useState(false);

  // System Prompt Modal
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [systemPromptValue, setSystemPromptValue] = useState("");
  const [savingSystemPrompt, setSavingSystemPrompt] = useState(false);

  // Persona Modal
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [personaValue, setPersonaValue] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);

  // Static Templates Modal
  const [showStaticTemplatesModal, setShowStaticTemplatesModal] =
    useState(false);
  const [staticTemplatesValue, setStaticTemplatesValue] = useState("");
  const [savingStaticTemplates, setSavingStaticTemplates] = useState(false);

  // Knowledge Base Modal
  const [showKBModal, setShowKBModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // WhatsApp Proposal Modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalConfig, setProposalConfig] = useState({
    proposalEnabled: false,
    keywordsInput: '',
    choicePrompt: 'Which proposal should I send?',
    confirmationPrompt: 'Would you like me to send this proposal now?',
    templates: [],
  });
  const [proposalKeywordsInput, setProposalKeywordsInput] = useState('');
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    pdfUrl: '',
    caption: '',
    buttonText: '',
    buttonPhone: '',
    enabled: true,
    fileName: '',
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [savingProposalConfig, setSavingProposalConfig] = useState(false);

  // Calendly Modal
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [calendlyConfig, setCalendlyConfig] = useState({
    enabled: false,
    keywordsInput: '',
    url: '',
    prompt: "Here’s my calendar to pick a time:",
    disabledMessage: "Scheduling is unavailable right now.",
  });
  const [calendlyKeywordsInput, setCalendlyKeywordsInput] = useState('');
  const [savingCalendlyConfig, setSavingCalendlyConfig] = useState(false);


  // Delete Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingChatbotId, setDeletingChatbotId] = useState(null);
  const [deletingChatbot, setDeletingChatbot] = useState(false);

  // Zoho CRM Modal
  const [showZohoModal, setShowZohoModal] = useState(false);
  const [zohoConfig, setZohoConfig] = useState({
    enabled: false,
    zoho_region: 'com',
    zoho_module: 'Leads',
    zoho_client_id: '',
    zoho_client_secret: '',
    zoho_refresh_token: '',
    capture_intent_keywords: [],
    required_fields: ['name', 'phone', 'email'],
    optional_fields: ['company'],
    name_prompt_text: "Great! What's your name?",
    phone_prompt_text: "What's your phone number?",
    email_prompt_text: "What's your email address?",
    company_prompt_text: "Which company are you from? (optional)",
    success_message: "Thank you! We've saved your details. Our team will reach out soon!",
  });
  const [zohoIntentInput, setZohoIntentInput] = useState('');
  const [savingZohoConfig, setSavingZohoConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [zohoRedirectUri, setZohoRedirectUri] = useState('');
  const [manualAuthCode, setManualAuthCode] = useState('');
  const [exchangingManualCode, setExchangingManualCode] = useState(false);
  // Check user on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      loadData();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load chatbot accounts, WhatsApp accounts, and auto-chat status in parallel
      const [chatbotRes, waRes, autoChatRes] = await Promise.all([
        api.get("/api/chatbot-accounts"),
        api.get("/api/accounts"),
        api
          .get("/api/auto-chat/status")
          .catch(() => ({ data: { success: true, data: { enabled: false } } })),
      ]);

      setChatbotAccounts(chatbotRes.data.chatbotAccounts || []);
      setWhatsappAccounts(waRes.data.accounts || []);
      setAutoChatEnabled(autoChatRes.data.data?.enabled || false);
      setCurrentAutoChatTopic(autoChatRes.data.data?.config?.topic || "");
    } catch (error) {
      console.error("Load data error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Auto-chat handlers
  const handleStartAutoChat = async () => {
    if (!autoChatTopic.trim()) {
      toast.error("Please enter a topic for the conversation");
      return;
    }

    setAutoChatLoading(true);
    try {
      const topicToStart = autoChatTopic.trim();
      await api.post("/api/auto-chat/start", { topic: topicToStart });
      setAutoChatEnabled(true);
      setCurrentAutoChatTopic(topicToStart);
      setShowAutoChatDialog(false);
      setAutoChatTopic("");
      toast.success(`Auto-chat started on topic: "${topicToStart}"`);
    } catch (error) {
      console.error("Auto-chat start error:", error);
      toast.error(error.response?.data?.error || "Failed to start auto-chat");
    } finally {
      setAutoChatLoading(false);
    }
  };

  const handleStopAutoChat = async () => {
    setAutoChatLoading(true);
    try {
      await api.post("/api/auto-chat/stop");
      setAutoChatEnabled(false);
      setCurrentAutoChatTopic("");
      toast.success("Auto-chat stopped");
    } catch (error) {
      console.error("Auto-chat stop error:", error);
      toast.error(error.response?.data?.error || "Failed to stop auto-chat");
    } finally {
      setAutoChatLoading(false);
    }
  };

  // Get available WhatsApp accounts
  const availableWhatsappAccounts = whatsappAccounts.filter(
    (wa) => !chatbotAccounts.some((cb) => cb.instanceId === wa._id)
  );

  // Add new chatbot
  const handleAddChatbot = async () => {
    if (!selectedInstanceId) {
      toast.error("Please select a WhatsApp account");
      return;
    }

    setAddingChatbot(true);
    try {
      const response = await api.post("/api/chatbot-accounts", {
        instanceId: selectedInstanceId,
      });

      setChatbotAccounts((prev) => [...prev, response.data.chatbotAccount]);
      setShowAddModal(false);
      setSelectedInstanceId("");
      toast.success("Chatbot created successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create chatbot");
    } finally {
      setAddingChatbot(false);
    }
  };

  // Toggle chatbot enabled/disabled
  const handleToggleChatbot = async (chatbotId) => {
    setTogglingChatbotId(chatbotId);
    try {
      const response = await api.post(
        `/api/chatbot-accounts/${chatbotId}/toggle`,
        {}
      );

      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, enabled: response.data.enabled } : cb
        )
      );

      toast.success(
        response.data.enabled ? "Chatbot enabled" : "Chatbot disabled"
      );
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error(
        `Failed to toggle chatbot: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setTogglingChatbotId(null);
    }
  };

  // Global Enable All Chatbots
  const handleEnableAllChatbots = async () => {
    const disabledChatbots = chatbotAccounts.filter((cb) => !cb.enabled);

    if (disabledChatbots.length === 0) {
      toast.error("All chatbots are already enabled");
      return;
    }

    setGlobalToggling(true);
    setToggleProgress({ current: 0, total: disabledChatbots.length });

    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < disabledChatbots.length; i++) {
      const chatbot = disabledChatbots[i];
      setToggleProgress({ current: i + 1, total: disabledChatbots.length });

      try {
        const response = await api.post(
          `/api/chatbot-accounts/${chatbot._id}/toggle`,
          {}
        );

        if (response.data.enabled) {
          setChatbotAccounts((prev) =>
            prev.map((cb) =>
              cb._id === chatbot._id ? { ...cb, enabled: true } : cb
            )
          );
          successCount++;
        }
      } catch (error) {
        console.warn(
          `Skipped chatbot ${chatbot.phoneNumber}:`,
          error.response?.data?.error || error.message
        );
        if (
          error.response?.data?.error?.includes(
            "WhatsApp connection pending"
          ) ||
          error.response?.data?.error?.includes("not connected")
        ) {
          skippedCount++;
        }
      }
    }

    setGlobalToggling(false);
    setToggleProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast.success(
        `Enabled ${successCount} chatbot${successCount > 1 ? "s" : ""}${
          skippedCount > 0
            ? `, skipped ${skippedCount} (connection pending)`
            : ""
        }`
      );
    } else if (skippedCount > 0) {
      toast.error(
        `Could not enable any chatbots. ${skippedCount} skipped due to WhatsApp connection issues.`
      );
    }
  };

  // Global Disable All Chatbots
  const handleDisableAllChatbots = async () => {
    const enabledChatbots = chatbotAccounts.filter((cb) => cb.enabled);

    if (enabledChatbots.length === 0) {
      toast.error("All chatbots are already disabled");
      return;
    }

    setGlobalToggling(true);
    setToggleProgress({ current: 0, total: enabledChatbots.length });

    let successCount = 0;

    for (let i = 0; i < enabledChatbots.length; i++) {
      const chatbot = enabledChatbots[i];
      setToggleProgress({ current: i + 1, total: enabledChatbots.length });

      try {
        const response = await api.post(
          `/api/chatbot-accounts/${chatbot._id}/toggle`,
          {}
        );

        if (!response.data.enabled) {
          setChatbotAccounts((prev) =>
            prev.map((cb) =>
              cb._id === chatbot._id ? { ...cb, enabled: false } : cb
            )
          );
          successCount++;
        }
      } catch (error) {
        console.error(
          `Failed to disable chatbot ${chatbot.phoneNumber}:`,
          error.response?.data?.error || error.message
        );
      }
    }

    setGlobalToggling(false);
    setToggleProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast.success(
        `Disabled ${successCount} chatbot${successCount > 1 ? "s" : ""}`
      );
    }
  };

  // Delete chatbot handlers
  const handleDeleteChatbot = (chatbotId) => {
    setDeletingChatbotId(chatbotId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteChatbot = async () => {
    if (!deletingChatbotId) return;

    setDeletingChatbot(true);
    try {
      await api.delete(`/api/chatbot-accounts/${deletingChatbotId}`);
      setChatbotAccounts((prev) =>
        prev.filter((cb) => cb._id !== deletingChatbotId)
      );
      toast.success("Chatbot deleted successfully");
      setShowDeleteConfirm(false);
      setDeletingChatbotId(null);
    } catch (error) {
      toast.error("Failed to delete chatbot");
    } finally {
      setDeletingChatbot(false);
    }
  };

  // Save System Prompt
  const handleSaveSystemPrompt = async () => {
    if (!selectedChatbot) return;

    setSavingSystemPrompt(true);
    try {
      await api.put(`/api/chatbot-accounts/${selectedChatbot._id}`, {
        systemPrompt: systemPromptValue,
      });

      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === selectedChatbot._id
            ? { ...cb, systemPrompt: systemPromptValue }
            : cb
        )
      );

      setShowSystemPromptModal(false);
      toast.success("System prompt saved");
    } catch (error) {
      toast.error("Failed to save system prompt");
    } finally {
      setSavingSystemPrompt(false);
    }
  };

  // Save Persona
  const handleSavePersona = async () => {
    if (!selectedChatbot) return;

    setSavingPersona(true);
    try {
      await api.put(`/api/chatbot-accounts/${selectedChatbot._id}`, {
        persona: personaValue,
      });

      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === selectedChatbot._id ? { ...cb, persona: personaValue } : cb
        )
      );

      setShowPersonaModal(false);
      toast.success("Persona saved");
    } catch (error) {
      toast.error("Failed to save persona");
    } finally {
      setSavingPersona(false);
    }
  };

  // Save Static Templates
  const handleSaveStaticTemplates = async () => {
    if (!selectedChatbot) return;

    setSavingStaticTemplates(true);
    try {
      // Validate JSON format
      try {
        JSON.parse(staticTemplatesValue);
      } catch (e) {
        toast.error("Invalid JSON format for static templates");
        setSavingStaticTemplates(false);
        return;
      }

      await api.put(`/api/chatbot-accounts/${selectedChatbot._id}`, {
        staticTemplates: staticTemplatesValue,
      });

      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === selectedChatbot._id
            ? { ...cb, staticTemplates: staticTemplatesValue }
            : cb
        )
      );

      setShowStaticTemplatesModal(false);
      toast.success("Static templates saved");
    } catch (error) {
      toast.error("Failed to save static templates");
    } finally {
      setSavingStaticTemplates(false);
    }
  };

  // Save WhatsApp Proposal Config
  const handleSaveProposalConfig = async () => {
    if (!selectedChatbot) return;

    // Build keywords array
    const keywords = proposalKeywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Validate templates
    if (!proposalConfig.templates || proposalConfig.templates.length === 0) {
      toast.error('Add at least one template');
      return;
    }
    const invalidTemplate = proposalConfig.templates.find(t => !t.name || !t.pdfUrl || !/^https?:\/\//i.test(t.pdfUrl));
    if (invalidTemplate) {
      toast.error('Each template needs a name and a valid HTTPS PDF URL');
      return;
    }

    setSavingProposalConfig(true);
    try {
      await api.put(`/api/chatbot-accounts/${selectedChatbot._id}`, {
        proposalFlow: {
          enabled: proposalConfig.proposalEnabled,
          keywords,
          choicePrompt: proposalConfig.choicePrompt,
          confirmationPrompt: proposalConfig.confirmationPrompt,
          templates: proposalConfig.templates,
        },
      });

      setChatbotAccounts(prev =>
        prev.map(cb =>
          cb._id === selectedChatbot._id
            ? {
                ...cb,
                proposalFlow: {
                  enabled: proposalConfig.proposalEnabled,
                  keywords,
                  choicePrompt: proposalConfig.choicePrompt,
                  confirmationPrompt: proposalConfig.confirmationPrompt,
                  templates: proposalConfig.templates,
                },
              }
            : cb
        )
      );

      toast.success('WhatsApp proposal settings saved');
      setShowProposalModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save proposal settings');
    } finally {
      setSavingProposalConfig(false);
    }
  };

  // Save Calendly Config
  const handleSaveCalendlyConfig = async () => {
    if (!selectedChatbot) return;

    const keywords = calendlyKeywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (calendlyConfig.enabled) {
      if (keywords.length === 0) {
        toast.error('Add at least one keyword');
        return;
      }
      if (!calendlyConfig.url || !/^https?:\/\//i.test(calendlyConfig.url)) {
        toast.error('Calendly link must be a valid HTTPS URL');
        return;
      }
    }

    setSavingCalendlyConfig(true);
    try {
      await api.put(`/api/chatbot-accounts/${selectedChatbot._id}`, {
        calendly: {
          enabled: calendlyConfig.enabled,
          keywords,
          url: calendlyConfig.url,
          prompt: calendlyConfig.prompt,
          disabledMessage: calendlyConfig.disabledMessage,
        },
      });

      setChatbotAccounts(prev =>
        prev.map(cb =>
          cb._id === selectedChatbot._id
            ? {
                ...cb,
                calendly: {
                  enabled: calendlyConfig.enabled,
                  keywords,
                  url: calendlyConfig.url,
                  prompt: calendlyConfig.prompt,
                  disabledMessage: calendlyConfig.disabledMessage,
                },
              }
            : cb
        )
      );

      toast.success('Calendly intent saved');
      setShowCalendlyModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save Calendly intent');
    } finally {
      setSavingCalendlyConfig(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      id: '',
      name: '',
      pdfUrl: '',
      caption: '',
      buttonText: '',
      buttonPhone: '',
      enabled: true,
    });
    setEditingTemplateId(null);
  };

  const handleAddOrUpdateTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.pdfUrl.trim()) {
      toast.error('Template name and PDF URL are required');
      return;
    }
    if (!/^https?:\/\//i.test(templateForm.pdfUrl.trim())) {
      toast.error('PDF URL must be a valid HTTPS link');
      return;
    }
    const newTemplate = {
      ...templateForm,
      id: templateForm.id || editingTemplateId || `tpl_${Date.now()}`,
      name: templateForm.name.trim(),
      pdfUrl: templateForm.pdfUrl.trim(),
      caption: (templateForm.caption || '').trim(),
      buttonText: (templateForm.buttonText || '').trim(),
      buttonPhone: (templateForm.buttonPhone || '').trim(),
      fileName: (templateForm.fileName || '').trim(),
    };

    setProposalConfig(prev => {
      const existing = prev.templates || [];
      const updated = editingTemplateId
        ? existing.map(t => (t.id === editingTemplateId ? newTemplate : t))
        : [...existing, newTemplate];
      return { ...prev, templates: updated };
    });

    resetTemplateForm();
  };

  const handleEditTemplate = (id) => {
    const tpl = (proposalConfig.templates || []).find(t => t.id === id);
    if (!tpl) return;
    setTemplateForm(tpl);
    setEditingTemplateId(id);
  };

  const handleToggleTemplateEnabled = (id, enabled) => {
    setProposalConfig(prev => ({
      ...prev,
      templates: (prev.templates || []).map(t =>
        t.id === id ? { ...t, enabled } : t
      ),
    }));
  };

  const handleDeleteTemplate = (id) => {
    setProposalConfig(prev => ({
      ...prev,
      templates: (prev.templates || []).filter(t => t.id !== id),
    }));
    if (editingTemplateId === id) {
      resetTemplateForm();
    }
  };

  // Load Zoho Config
  const loadZohoConfig = async (chatbotId) => {
    try {
      // Use admin endpoint to get decrypted credentials (getZohoConfig already uses /admin endpoint)
      const response = await zohoAPI.getZohoConfig(chatbotId);
      if (response.success && response.data) {
        setZohoConfig({
          enabled: response.data.enabled || false,
          zoho_region: response.data.zoho_region || 'com',
          zoho_module: response.data.zoho_module || 'Leads',
          zoho_client_id: response.data.zoho_client_id || '',
          zoho_client_secret: response.data.zoho_client_secret || '',
          zoho_refresh_token: response.data.zoho_refresh_token || '',
          capture_intent_keywords: response.data.capture_intent_keywords || [],
          required_fields: response.data.required_fields || ['name', 'phone', 'email'],
          optional_fields: response.data.optional_fields || ['company'],
          name_prompt_text: response.data.name_prompt_text || "Great! What's your name?",
          phone_prompt_text: response.data.phone_prompt_text || "What's your phone number?",
          email_prompt_text: response.data.email_prompt_text || "What's your email address?",
          company_prompt_text: response.data.company_prompt_text || "Which company are you from? (optional)",
          success_message: response.data.success_message || "Thank you! We've saved your details. Our team will reach out soon!",
        });
        setZohoIntentInput((response.data.capture_intent_keywords || []).join(', '));
      } else {
        // Config doesn't exist, use defaults
        setZohoConfig({
          enabled: false,
          zoho_region: 'com',
          zoho_module: 'Leads',
          zoho_client_id: '',
          zoho_client_secret: '',
          zoho_refresh_token: '',
          capture_intent_keywords: [],
          required_fields: ['name', 'phone', 'email'],
          optional_fields: ['company'],
          name_prompt_text: "Great! What's your name?",
          phone_prompt_text: "What's your phone number?",
          email_prompt_text: "What's your email address?",
          company_prompt_text: "Which company are you from? (optional)",
          success_message: "Thank you! We've saved your details. Our team will reach out soon!",
        });
        setZohoIntentInput('');
      }
    } catch (error) {
      console.error('Error loading Zoho config:', error);
      // Use defaults if error - config might not exist yet
      setZohoConfig({
        enabled: false,
        zoho_region: 'com',
        zoho_module: 'Leads',
        zoho_client_id: '',
        zoho_client_secret: '',
        zoho_refresh_token: '',
        capture_intent_keywords: [],
        required_fields: ['name', 'phone', 'email'],
        optional_fields: ['company'],
        name_prompt_text: "Great! What's your name?",
        phone_prompt_text: "What's your phone number?",
        email_prompt_text: "What's your email address?",
        company_prompt_text: "Which company are you from? (optional)",
        success_message: "Thank you! We've saved your details. Our team will reach out soon!",
      });
      setZohoIntentInput('');
    }
  };

  // Save Zoho Config
  const handleSaveZohoConfig = async () => {
    if (!selectedChatbot) return;

    setSavingZohoConfig(true);
    try {
      await zohoAPI.updateZohoConfig(selectedChatbot._id, zohoConfig);
      toast.success('Zoho configuration saved successfully');
      setShowZohoModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save Zoho configuration');
    } finally {
      setSavingZohoConfig(false);
    }
  };

  // Test Zoho Connection
  const handleTestConnection = async () => {
    if (!selectedChatbot) return;

    // Check if credentials are filled in the form
    if (!zohoConfig.zoho_client_id || !zohoConfig.zoho_client_secret || !zohoConfig.zoho_refresh_token) {
      toast.error('Please enter Client ID, Client Secret, and Refresh Token, then save the configuration before testing connection.');
      return;
    }

    // Save config first to ensure it exists in database
    try {
      await zohoAPI.updateZohoConfig(selectedChatbot._id, zohoConfig);
    } catch (error) {
      toast.error('Please save the configuration first before testing connection.');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await zohoAPI.testConnection(selectedChatbot._id);
      if (response.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(response.error || 'Connection test failed');
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.error || 'Connection test failed';
      toast.error(errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  // Generate Refresh Token
  const handleGenerateRefreshToken = async () => {
    if (!selectedChatbot) return;

    // Check if Client ID and Secret are filled
    if (!zohoConfig.zoho_client_id || !zohoConfig.zoho_client_secret) {
      toast.error('Please enter Client ID and Client Secret before generating refresh token.');
      return;
    }

    try {
      const response = await zohoAPI.getAuthorizationUrl(selectedChatbot._id, zohoConfig.zoho_region);
      if (response.success && response.data.authorizationUrl) {
        // Store redirect URI for display
        if (response.data.redirectUri) {
          setZohoRedirectUri(response.data.redirectUri);
        }
        // Open popup window for OAuth
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
          response.data.authorizationUrl,
          'Zoho OAuth',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        // Listen for OAuth callback
        const messageHandler = async (event) => {
          // Log all messages for debugging
          console.log('🔍 [Zoho OAuth] Message received:', {
            type: event.data?.type,
            origin: event.origin,
            hasCode: !!event.data?.code,
            data: event.data
          });

          if (event.data?.type === 'zoho-oauth-callback') {
            console.log('✅ [Zoho OAuth] Received authorization code, exchanging for token...');
            window.removeEventListener('message', messageHandler);

            // Try to close popup, but don't fail if COOP blocks it
            try {
              if (popup) {
                popup.close();
              }
            } catch (e) {
              // COOP may block popup.close(), but that's okay - callback page will close itself
              console.warn('Could not close popup (COOP restriction):', e.message);
            }

            try {
              const response = await zohoAPI.exchangeCodeForToken(
                selectedChatbot._id,
                event.data.code,
                event.data.region || zohoConfig.zoho_region
              );

              console.log('✅ [Zoho OAuth] Token exchange successful:', response);

              if (response.success) {
                // Update the config with the refresh token if provided
                if (response.data?.refreshToken) {
                  setZohoConfig(prev => ({
                    ...prev,
                    zoho_refresh_token: response.data.refreshToken
                  }));
                  toast.success('✅ Refresh token generated and saved successfully!');
                } else {
                  // Token was saved on backend, just reload config
                  toast.success('✅ Refresh token generated and saved successfully!');
                  await loadZohoConfig(selectedChatbot._id);
                }
              } else {
                throw new Error(response.error || 'No refresh token in response');
              }
            } catch (error) {
              console.error('❌ [Zoho OAuth] Token exchange error:', error);
              const errorMessage = error.message || error.response?.data?.error || 'Failed to exchange code for token';
              toast.error(errorMessage);
            }
          }
        };

        window.addEventListener('message', messageHandler);
        console.log('👂 [Zoho OAuth] Message listener attached');

        // Store popup reference for cleanup (don't check closed status due to COOP)
        // The popup will close itself after sending the message
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.error || 'Failed to generate authorization URL';
      toast.error(errorMessage);
    }
  };
  // Upload Knowledge File
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChatbot) return;

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = [".pdf", ".txt", ".docx"];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("Only PDF, TXT, and DOCX files are allowed");
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(
        `/api/chatbot-accounts/${selectedChatbot._id}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("File uploaded, processing started");
      loadData();
      setTimeout(() => refreshChatbotFiles(selectedChatbot._id), 5000);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Refresh chatbot files
  const refreshChatbotFiles = async (chatbotId) => {
    try {
      const response = await api.get(
        `/api/chatbot-accounts/${chatbotId}/files`
      );
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId
            ? { ...cb, knowledgeFiles: response.data.files }
            : cb
        )
      );

      const hasProcessing = response.data.files.some(
        (f) => f.status === "processing"
      );
      if (hasProcessing) {
        setTimeout(() => refreshChatbotFiles(chatbotId), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  // Delete Knowledge File
  const handleDeleteFile = async (filename) => {
    if (!selectedChatbot) return;

    try {
      await api.delete(
        `/api/chatbot-accounts/${
          selectedChatbot._id
        }/files/${encodeURIComponent(filename)}`
      );
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === selectedChatbot._id
            ? {
                ...cb,
                knowledgeFiles: cb.knowledgeFiles.filter(
                  (f) => f.filename !== filename
                ),
              }
            : cb
        )
      );
      toast.success("File deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  // Toggle settings
  const handleToggleAutoChatExclusion = async (chatbotId, excluded) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}`, {
        excludeFromAutoChat: excluded,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, excludeFromAutoChat: excluded } : cb
        )
      );
      toast.success(
        excluded
          ? "Chatbot excluded from auto-chat"
          : "Chatbot included in auto-chat"
      );
    } catch (error) {
      toast.error("Failed to update auto-chat exclusion");
    }
  };

  const handleToggleStaticTemplates = async (chatbotId, enabled) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}`, {
        useStaticTemplates: enabled,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, useStaticTemplates: enabled } : cb
        )
      );
      toast.success(
        enabled ? "Static templates enabled" : "Static templates disabled"
      );
    } catch (error) {
      toast.error("Failed to update static templates setting");
    }
  };

  const handleToggleLeadKeywords = async (chatbotId, enabled) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}/keywords`, {
        leadKeywordsEnabled: enabled,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, leadKeywordsEnabled: enabled } : cb
        )
      );
      toast.success(
        enabled
          ? "Lead keyword capture enabled"
          : "Lead keyword capture disabled"
      );
    } catch (error) {
      toast.error("Failed to update lead keyword setting");
    }
  };

  const handleToggleFollowUpKeywords = async (chatbotId, enabled) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}/keywords`, {
        followUpKeywordsEnabled: enabled,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId
            ? { ...cb, followUpKeywordsEnabled: enabled }
            : cb
        )
      );
      toast.success(
        enabled
          ? "Follow-up keyword capture enabled"
          : "Follow-up keyword capture disabled"
      );
    } catch (error) {
      toast.error("Failed to update follow-up keyword setting");
    }
  };

  const handleToggleDisableFormatting = async (chatbotId, enabled) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}`, {
        disableFormatting: enabled,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, disableFormatting: enabled } : cb
        )
      );
      toast.success(
        enabled
          ? "Simple paragraph mode enabled"
          : "Structured formatting enabled"
      );
    } catch (error) {
      toast.error("Failed to update formatting setting");
    }
  };
  const handleSaveLeadKeywords = async (chatbotId, keywords) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}/keywords`, {
        leadKeywords: keywords,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, leadKeywords: keywords } : cb
        )
      );
      toast.success("Lead keywords saved");
    } catch (error) {
      toast.error("Failed to save lead keywords");
    }
  };

  const handleSaveFollowUpKeywords = async (chatbotId, keywords) => {
    try {
      await api.put(`/api/chatbot-accounts/${chatbotId}/keywords`, {
        followUpKeywords: keywords,
      });
      setChatbotAccounts((prev) =>
        prev.map((cb) =>
          cb._id === chatbotId ? { ...cb, followUpKeywords: keywords } : cb
        )
      );
      toast.success("Follow-up keywords saved");
    } catch (error) {
      toast.error("Failed to save follow-up keywords");
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Show loading while user data is being fetched
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner
            className="animate-spin text-emerald-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner
            className="animate-spin text-emerald-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FaRobot className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
              Manage Chatbot
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Configure and manage your WhatsApp chatbots
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                {chatbotAccounts.length}{" "}
                {chatbotAccounts.length === 1 ? "Chatbot" : "Chatbots"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={availableWhatsappAccounts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPlus size={16} />
            Add Chatbot
          </button>

          {chatbotAccounts.length > 0 && (
            <>
              <button
                onClick={handleEnableAllChatbots}
                disabled={
                  globalToggling ||
                  chatbotAccounts.filter((cb) => !cb.enabled).length === 0
                }
                className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
              >
                {globalToggling && toggleProgress.total > 0 ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    {toggleProgress.current}/{toggleProgress.total}
                  </>
                ) : (
                  <>
                    <FaPowerOff size={14} />
                    Enable All (
                    {chatbotAccounts.filter((cb) => cb.enabled).length}/
                    {chatbotAccounts.length})
                  </>
                )}
              </button>
              <button
                onClick={handleDisableAllChatbots}
                disabled={
                  globalToggling ||
                  chatbotAccounts.filter((cb) => cb.enabled).length === 0
                }
                className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
              >
                {globalToggling && toggleProgress.total > 0 ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    {toggleProgress.current}/{toggleProgress.total}
                  </>
                ) : (
                  <>
                    <FaPowerOff size={14} />
                    Disable All
                  </>
                )}
              </button>
            </>
          )}

          {autoChatEnabled ? (
            <button
              onClick={handleStopAutoChat}
              disabled={autoChatLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 min-w-[160px] justify-center"
            >
              {autoChatLoading ? (
                <FaSpinner className="animate-spin" size={14} />
              ) : (
                <FaComments size={14} />
              )}
              Stop Auto-Chat
            </button>
          ) : (
            <button
              onClick={() => setShowAutoChatDialog(true)}
              disabled={chatbotAccounts.length < 2}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
            >
              <FaComments size={14} />
              Start Auto-Chat
            </button>
          )}
        </div>
      </div>

      {/* Auto-chat info banner */}
      {autoChatEnabled && (
        <div className="glass-card rounded-xl p-4 border border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-3">
            <FaMagic className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1 text-emerald-900">
                Auto-Chat Mode Active
              </h4>
              <p className="text-sm text-zinc-600 mb-2">
                All enabled chatbots are having LLM-based conversations about
                the following topic:
              </p>
              <div className="bg-white/60 border border-emerald-200 rounded-md px-3 py-2">
                <p className="text-sm font-medium text-emerald-700">
                  &ldquo;{currentAutoChatTopic}&rdquo;
                </p>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Regular chatbot conversations continue using their persona and
                knowledge base.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-chat disabled info */}
      {chatbotAccounts.length < 2 && chatbotAccounts.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-zinc-200 bg-zinc-50/50">
          <div className="flex items-start gap-3">
            <FaComments className="w-5 h-5 text-zinc-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                Auto-Chat Unavailable
              </h4>
              <p className="text-sm text-zinc-600">
                Auto-chat requires at least 2 enabled chatbots. Add more
                chatbots to enable this feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Cards Grid */}
      {chatbotAccounts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center border border-zinc-200">
          <FaRobot className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
          <h3 className="text-xl font-semibold mb-2 text-zinc-900">
            No Chatbots Configured
          </h3>
          <p className="text-zinc-600 mb-4">
            Create a chatbot to automatically respond to incoming WhatsApp
            messages
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={availableWhatsappAccounts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            <FaPlus size={16} />
            Add Chatbot
          </button>
          {availableWhatsappAccounts.length === 0 &&
            whatsappAccounts.length > 0 && (
              <p className="text-sm text-zinc-500 mt-2">
                All WhatsApp accounts already have chatbots configured
              </p>
            )}
        </div>
      ) : (
        <div className="w-full space-y-6">
          {chatbotAccounts.map((chatbot) => (
            <ChatbotCard
              key={chatbot._id}
              chatbot={chatbot}
              isToggling={togglingChatbotId === chatbot._id}
              onToggle={() => handleToggleChatbot(chatbot._id)}
              onDelete={() => handleDeleteChatbot(chatbot._id)}
              onPersona={() => {
                setSelectedChatbot(chatbot);
                setPersonaValue(chatbot.persona);
                setShowPersonaModal(true);
              }}
              onKnowledgeBase={() => {
                setSelectedChatbot(chatbot);
                setShowKBModal(true);
              }}
              onStaticTemplates={() => {
                setSelectedChatbot(chatbot);
                setStaticTemplatesValue(chatbot.staticTemplates || "{}");
                setShowStaticTemplatesModal(true);
              }}
                            onZohoCRM={async () => {
                setSelectedChatbot(chatbot);
                await loadZohoConfig(chatbot._id);
                setShowZohoModal(true);
              }}
              onProposal={() => {
                setSelectedChatbot(chatbot);
                setProposalConfig({
                  proposalEnabled: chatbot.proposalFlow?.enabled || false,
                  keywordsInput: (chatbot.proposalFlow?.keywords || []).join(', '),
                  choicePrompt: chatbot.proposalFlow?.choicePrompt || 'Which proposal should I send?',
                  confirmationPrompt: chatbot.proposalFlow?.confirmationPrompt || 'Would you like me to send this proposal now?',
      templates: (chatbot.proposalFlow?.templates || []).map(t => ({
        ...t,
        fileName: t.fileName || '',
      })),
                });
                setProposalKeywordsInput((chatbot.proposalFlow?.keywords || []).join(', '));
                setTemplateForm({
                  id: '',
                  name: '',
                  pdfUrl: '',
                  caption: '',
                  buttonText: '',
                  buttonPhone: '',
                  enabled: true,
                  fileName: '',
                });
                setEditingTemplateId(null);
                setShowProposalModal(true);
              }}
              onCalendly={() => {
                setSelectedChatbot(chatbot);
                setCalendlyConfig({
                  enabled: chatbot.calendly?.enabled || false,
                  keywordsInput: (chatbot.calendly?.keywords || []).join(', '),
                  url: chatbot.calendly?.url || '',
                  prompt: chatbot.calendly?.prompt || "Here’s my calendar to pick a time:",
                  disabledMessage: chatbot.calendly?.disabledMessage || "Scheduling is unavailable right now.",
                });
                setCalendlyKeywordsInput((chatbot.calendly?.keywords || []).join(', '));
                setShowCalendlyModal(true);
              }}
              onToggleAutoChatExclusion={handleToggleAutoChatExclusion}
              onToggleStaticTemplates={handleToggleStaticTemplates}
              onToggleLeadKeywords={handleToggleLeadKeywords}
              onToggleFollowUpKeywords={handleToggleFollowUpKeywords}
              onSaveLeadKeywords={handleSaveLeadKeywords}
              onSaveFollowUpKeywords={handleSaveFollowUpKeywords}
              onToggleDisableFormatting={handleToggleDisableFormatting}
            />
          ))}
        </div>
      )}

      {/* Add Chatbot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaRobot size={20} />
              Add Chatbot
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Link a chatbot to a WhatsApp number
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  WhatsApp Account
                </label>
                <select
                  value={selectedInstanceId}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select WhatsApp account</option>
                  {availableWhatsappAccounts.map((wa) => (
                    <option key={wa._id} value={wa._id}>
                      {wa.phoneNumber} - {wa.accountName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-2">
                  Select a WhatsApp account to enable AI chatbot auto-reply
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChatbot}
                  disabled={addingChatbot}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingChatbot ? (
                    <>
                      <FaSpinner className="animate-spin" size={14} />
                      Creating...
                    </>
                  ) : (
                    "Create Chatbot"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Prompt Modal */}
      {showSystemPromptModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-2xl border border-zinc-200 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaCog size={20} />
              System Prompt - {selectedChatbot.phoneNumber}
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Define how the chatbot should behave and respond
            </p>
            <textarea
              placeholder="You are a helpful assistant for..."
              value={systemPromptValue}
              onChange={(e) => setSystemPromptValue(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Example: You are a helpful real estate assistant. Your job is to
              answer questions about properties, pricing, and schedule site
              visits.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSystemPromptModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSystemPrompt}
                disabled={savingSystemPrompt}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSystemPrompt ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persona Modal */}
      {showPersonaModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-2xl border border-zinc-200 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaUser size={20} />
              Persona - {selectedChatbot.phoneNumber}
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Define the chatbot&apos;s personality and tone
            </p>
            <textarea
              placeholder="Friendly and professional..."
              value={personaValue}
              onChange={(e) => setPersonaValue(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Example: Speak in a friendly, professional tone. Use Hindi-English
              mix when appropriate. Keep responses concise but helpful.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowPersonaModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePersona}
                disabled={savingPersona}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingPersona ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Static Templates Modal */}
      {showStaticTemplatesModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-3xl border border-zinc-200 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaFileAlt size={20} />
              Static Templates - {selectedChatbot.phoneNumber}
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Define exact responses for common queries (JSON format)
            </p>
            <textarea
              placeholder='{\n  "hi|hello|hey": "Hi {customerName}! How can I help you?",\n  "pricing|cost": "Let me share our pricing..."\n}'
              value={staticTemplatesValue}
              onChange={(e) => setStaticTemplatesValue(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono text-sm"
            />
            <div className="text-xs text-zinc-500 mt-3 space-y-2">
              <p>
                <strong>Format:</strong> JSON object with keyword patterns as
                keys
              </p>
              <p>
                <strong>Keywords:</strong> Use | (pipe) to separate multiple
                triggers
              </p>
              <p>
                <strong>Placeholders:</strong> Use {"{customerName}"} for
                personalization
              </p>
              <p>
                <strong>Formatting:</strong> Use \n for line breaks, *text* for
                bold
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowStaticTemplatesModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaticTemplates}
                disabled={savingStaticTemplates}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingStaticTemplates ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Modal */}
      {showKBModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-2xl border border-zinc-200 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaFileAlt size={20} />
              Knowledge Base - {selectedChatbot.phoneNumber}
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Upload documents to train your chatbot
            </p>

            {/* Uploaded Files List */}
            {selectedChatbot.knowledgeFiles &&
              selectedChatbot.knowledgeFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Uploaded Files
                  </label>
                  <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200 max-h-60 overflow-y-auto">
                    {selectedChatbot.knowledgeFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FaFileAlt className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {file.filename}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatFileSize(file.fileSize)} -{" "}
                              {file.totalChunks} chunks
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              file.status === "ready"
                                ? "bg-emerald-100 text-emerald-700"
                                : file.status === "processing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {file.status === "processing" && (
                              <FaSpinner
                                className="inline animate-spin mr-1"
                                size={10}
                              />
                            )}
                            {file.status}
                          </span>
                          <button
                            onClick={() => handleDeleteFile(file.filename)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FaUpload className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
              <p className="text-sm mb-2 text-zinc-600">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="text-emerald-600 hover:underline font-medium disabled:opacity-50"
                >
                  Click to upload
                </button>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-zinc-500">
                PDF, TXT, DOCX (Max 50MB per file)
              </p>
              {uploadingFile && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <FaSpinner
                    className="animate-spin text-emerald-600"
                    size={16}
                  />
                  <span className="text-sm text-zinc-600">Uploading...</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowKBModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
     {/* Zoho CRM Configuration Modal */}
      {showZohoModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-4xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                <FaCog size={20} />
                Zoho CRM Integration - {selectedChatbot.phoneNumber}
              </h2>
              <button
                onClick={() => setShowZohoModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Enable Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">Enable Zoho Lead Capture</span>
                  <p className="text-xs text-zinc-500 mt-1">
                    Automatically capture leads to Zoho CRM when users show interest.
                  </p>
                </div>
                <button
                  onClick={() => setZohoConfig({...zohoConfig, enabled: !zohoConfig.enabled})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    zohoConfig.enabled ? 'bg-purple-500' : 'bg-zinc-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    zohoConfig.enabled ? 'transform translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>

            {zohoConfig.enabled && (
              <div className="space-y-6">
                {/* Zoho Credentials Section */}
                <div className="border border-zinc-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4">Zoho CRM Credentials</h3>

                  {/* Redirect URI Instructions */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-900 mb-2">⚠️ Important: Configure Redirect URI in Zoho</p>
                    <p className="text-xs text-blue-700 mb-2">
                      Before generating a refresh token, you must add this redirect URI in your Zoho Developer Console:
                    </p>
                    <div className="bg-white p-2 rounded border border-blue-300 mb-2">
                      <code className="text-xs text-blue-900 break-all">
                        {zohoRedirectUri || `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5000/api/zoho/callback`}
                      </code>
                    </div>
                    <p className="text-xs text-blue-700">
                      Go to: <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Zoho Developer Console</a> → Your App → Authorized Redirect URIs → Add the URL above
                    </p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      💡 Tip: Click "Generate" button below to get the exact redirect URI for your environment
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Zoho Region</label>
                      <select
                        value={zohoConfig.zoho_region}
                        onChange={(e) => setZohoConfig({...zohoConfig, zoho_region: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="com">United States (.com)</option>
                        <option value="eu">Europe (.eu)</option>
                        <option value="in">India (.in)</option>
                        <option value="au">Australia (.com.au)</option>
                        <option value="jp">Japan (.jp)</option>
                        <option value="ca">Canada (.ca)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Zoho Module</label>
                      <select
                        value={zohoConfig.zoho_module}
                        onChange={(e) => setZohoConfig({...zohoConfig, zoho_module: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Leads">Leads</option>
                        <option value="Contacts">Contacts</option>
                        <option value="Deals">Deals</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Client ID</label>
                      <div className="relative">
                        <input
                          type={showClientId ? 'text' : 'password'}
                          value={zohoConfig.zoho_client_id}
                          onChange={(e) => setZohoConfig({...zohoConfig, zoho_client_id: e.target.value})}
                          placeholder="Enter Zoho Client ID"
                          className="w-full px-4 py-2 pr-10 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClientId(!showClientId)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                        >
                          {showClientId ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showClientSecret ? 'text' : 'password'}
                          value={zohoConfig.zoho_client_secret}
                          onChange={(e) => setZohoConfig({...zohoConfig, zoho_client_secret: e.target.value})}
                          placeholder="Enter Zoho Client Secret"
                          className="w-full px-4 py-2 pr-10 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                        >
                          {showClientSecret ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Refresh Token</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showRefreshToken ? 'text' : 'password'}
                            value={zohoConfig.zoho_refresh_token}
                            onChange={(e) => setZohoConfig({...zohoConfig, zoho_refresh_token: e.target.value})}
                            placeholder="Enter Zoho Refresh Token"
                            className="w-full px-4 py-2 pr-10 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRefreshToken(!showRefreshToken)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                          >
                            {showRefreshToken ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                          </button>
                        </div>
                        <button
                          onClick={handleGenerateRefreshToken}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <FaLink size={14} />
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                          or get from Zoho Developer Console
                        </a>
                      </p>
                    </div>

                    {/* Manual Code Exchange */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-2">
                        <strong>Manual Exchange:</strong> If the automatic flow didn't work, copy the authorization code from the callback page and paste it here:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualAuthCode}
                          onChange={(e) => setManualAuthCode(e.target.value)}
                          placeholder="Paste authorization code here"
                          className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={async () => {
                            if (!selectedChatbot) return;
                            if (!manualAuthCode.trim()) {
                              toast.error('Please enter the authorization code');
                              return;
                            }
                            setExchangingManualCode(true);
                            try {
                              const response = await zohoAPI.exchangeCodeForToken(
                                selectedChatbot._id,
                                manualAuthCode.trim(),
                                zohoConfig.zoho_region
                              );
                              if (response.success && response.data?.refreshToken) {
                                setZohoConfig(prev => ({
                                  ...prev,
                                  zoho_refresh_token: response.data.refreshToken
                                }));
                                setManualAuthCode('');
                                toast.success('✅ Refresh token generated successfully!');
                              } else {
                                throw new Error('No refresh token in response');
                              }
                            } catch (error) {
                              const errorMessage = error.message || error.response?.data?.error || 'Failed to exchange code';
                              toast.error(errorMessage);
                            } finally {
                              setExchangingManualCode(false);
                            }
                          }}
                          disabled={exchangingManualCode || !manualAuthCode.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                        >
                          {exchangingManualCode ? (
                            <>
                              <FaSpinner className="animate-spin" size={14} />
                              Exchanging...
                            </>
                          ) : (
                            <>
                              <FaLink size={14} />
                              Exchange Code
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {testingConnection ? (
                        <>
                          <FaSpinner className="animate-spin" size={14} />
                          Testing...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle size={14} />
                          Test Connection
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Lead Capture Settings */}
                <div className="border border-zinc-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4">Lead Capture Settings</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Intent Keywords</label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Add keywords that trigger lead capture (e.g., "interested", "want to buy", "get quote")
                    </p>
                    <input
                      type="text"
                      value={zohoIntentInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setZohoIntentInput(value);
                        const keywords = value.split(',').map(k => k.trim()).filter(k => k);
                        setZohoConfig({...zohoConfig, capture_intent_keywords: keywords});
                      }}
                      placeholder="Enter keyword (e.g., interested)"
                      className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {zohoConfig.capture_intent_keywords.length === 0 ? 'No keywords added yet' : `${zohoConfig.capture_intent_keywords.length} keyword(s) added`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Required Fields</label>
                      <div className="space-y-2">
                        {['name', 'phone', 'email', 'company'].map(field => (
                          <label key={field} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={zohoConfig.required_fields.includes(field)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setZohoConfig({
                                    ...zohoConfig,
                                    required_fields: [...zohoConfig.required_fields, field],
                                    optional_fields: zohoConfig.optional_fields.filter(f => f !== field)
                                  });
                                } else {
                                  setZohoConfig({
                                    ...zohoConfig,
                                    required_fields: zohoConfig.required_fields.filter(f => f !== field)
                                  });
                                }
                              }}
                              className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-zinc-700 capitalize">{field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Optional Fields</label>
                      <div className="space-y-2">
                        {['name', 'phone', 'email', 'company'].map(field => (
                          <label key={field} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={zohoConfig.optional_fields.includes(field)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setZohoConfig({
                                    ...zohoConfig,
                                    optional_fields: [...zohoConfig.optional_fields, field],
                                    required_fields: zohoConfig.required_fields.filter(f => f !== field)
                                  });
                                } else {
                                  setZohoConfig({
                                    ...zohoConfig,
                                    optional_fields: zohoConfig.optional_fields.filter(f => f !== field)
                                  });
                                }
                              }}
                              className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-zinc-700 capitalize">{field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Prompts */}
                <div className="border border-zinc-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4">Field Prompts</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Name Prompt</label>
                      <input
                        type="text"
                        value={zohoConfig.name_prompt_text}
                        onChange={(e) => setZohoConfig({...zohoConfig, name_prompt_text: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Phone Prompt</label>
                      <input
                        type="text"
                        value={zohoConfig.phone_prompt_text}
                        onChange={(e) => setZohoConfig({...zohoConfig, phone_prompt_text: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Email Prompt</label>
                      <input
                        type="text"
                        value={zohoConfig.email_prompt_text}
                        onChange={(e) => setZohoConfig({...zohoConfig, email_prompt_text: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Company Prompt</label>
                      <input
                        type="text"
                        value={zohoConfig.company_prompt_text}
                        onChange={(e) => setZohoConfig({...zohoConfig, company_prompt_text: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Success Message</label>
                      <textarea
                        value={zohoConfig.success_message}
                        onChange={(e) => setZohoConfig({...zohoConfig, success_message: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-zinc-200">
                  <button
                    onClick={() => setShowZohoModal(false)}
                    className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveZohoConfig}
                    disabled={savingZohoConfig}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingZohoConfig ? (
                      <>
                        <FaSpinner className="animate-spin" size={14} />
                        Saving...
                      </>
                    ) : (
                      'Update Zoho Configuration'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Proposal Modal */}
      {showProposalModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-3xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                <FaFileAlt size={18} />
                WhatsApp Proposal - {selectedChatbot.phoneNumber}
              </h2>
              <button
                onClick={() => setShowProposalModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">Enable WhatsApp Proposal</span>
                  <p className="text-xs text-zinc-500 mt-1">
                    When proposal keywords are detected, start the proposal flow (choice → confirm → send PDF).
                  </p>
                </div>
                <button
                  onClick={() => setProposalConfig(prev => ({ ...prev, proposalEnabled: !prev.proposalEnabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    proposalConfig.proposalEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      proposalConfig.proposalEnabled ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Proposal Keywords / Intents</label>
                <input
                  type="text"
                  value={proposalKeywordsInput}
                  onChange={(e) => setProposalKeywordsInput(e.target.value)}
                  placeholder="send proposal, proposal, pdf, whatsapp proposal"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Comma-separated; when matched, the flow starts.</p>
              </div>

              {/* Prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Template Choice Prompt</label>
                  <input
                    type="text"
                    value={proposalConfig.choicePrompt}
                    onChange={(e) => setProposalConfig(prev => ({ ...prev, choicePrompt: e.target.value }))}
                    placeholder="Which proposal should I send?"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Confirmation Prompt</label>
                  <input
                    type="text"
                    value={proposalConfig.confirmationPrompt}
                    onChange={(e) => setProposalConfig(prev => ({ ...prev, confirmationPrompt: e.target.value }))}
                    placeholder="Should I send this proposal now?"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Templates list */}
              <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Templates</p>
                    <p className="text-xs text-zinc-500">Add multiple proposals; user will choose if more than one is enabled.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(proposalConfig.templates || []).length === 0 && (
                    <p className="text-sm text-zinc-500">No templates yet. Add one below.</p>
                  )}

                  {(proposalConfig.templates || []).map((tpl, idx) => (
                    <div
                      key={tpl.id || idx}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border border-zinc-200 rounded-lg bg-zinc-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                          {tpl.name}
                          <span className="text-xs px-2 py-0.5 rounded-full border">
                            {tpl.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500 break-all">{tpl.pdfUrl}</p>
                        {tpl.fileName ? <p className="text-xs text-zinc-500">File name: {tpl.fileName}</p> : null}
                        {tpl.caption && <p className="text-xs text-zinc-500">Caption: {tpl.caption}</p>}
                        {tpl.buttonPhone && (
                          <p className="text-xs text-zinc-500">CTA: {tpl.buttonText || 'Call Now'} → {tpl.buttonPhone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTemplateEnabled(tpl.id, !tpl.enabled)}
                          className={`px-3 py-1 text-xs rounded-lg border ${
                            tpl.enabled ? 'border-emerald-300 text-emerald-700' : 'border-zinc-300 text-zinc-600'
                          }`}
                        >
                          {tpl.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleEditTemplate(tpl.id)}
                          className="px-3 py-1 text-xs rounded-lg border border-blue-300 text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Template form */}
                <div className="border-t border-zinc-200 pt-3 space-y-3">
                  <p className="text-sm font-semibold text-zinc-900">{editingTemplateId ? 'Edit Template' : 'Add Template'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Proposal - Product A"
                        className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">PDF URL</label>
                      <input
                        type="url"
                        value={templateForm.pdfUrl}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, pdfUrl: e.target.value }))}
                        placeholder="https://example.com/proposal.pdf"
                        className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm"
                      />
                    </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">File Name (optional)</label>
                  <input
                    type="text"
                    value={templateForm.fileName}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, fileName: e.target.value }))}
                    placeholder="Proposal-Swara.pdf"
                    className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-zinc-500">If empty, the name will be derived from the URL.</p>
                </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Caption / Body</label>
                      <textarea
                        value={templateForm.caption}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, caption: e.target.value }))}
                        rows={3}
                        placeholder="Dear Customer, please check the attached proposal..."
                        className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Button Text (optional)</label>
                      <input
                        type="text"
                        value={templateForm.buttonText}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, buttonText: e.target.value }))}
                        placeholder="Call Now"
                        className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Button Phone (tel:)</label>
                      <input
                        type="text"
                        value={templateForm.buttonPhone}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, buttonPhone: e.target.value }))}
                        placeholder="+91XXXXXXXXXX"
                        className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddOrUpdateTemplate}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {editingTemplateId ? 'Update Template' : 'Add Template'}
                    </button>
                    {editingTemplateId && (
                      <button
                        onClick={resetTemplateForm}
                        className="px-4 py-2 bg-zinc-100 text-sm rounded-lg border border-zinc-200"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-emerald-100 bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700">
                Uses the proposal keywords to trigger; if multiple templates are enabled, the user is asked to choose, then to confirm; on confirm, the selected PDF is sent as a document with your caption and optional call button.
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setShowProposalModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProposalConfig}
                disabled={savingProposalConfig}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingProposalConfig ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Saving...
                  </>
                ) : (
                  'Save Proposal Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendly Intent Modal */}
      {showCalendlyModal && selectedChatbot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-3xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                <FaLink size={18} />
                Calendly Intent - {selectedChatbot.phoneNumber}
              </h2>
              <button
                onClick={() => setShowCalendlyModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">Enable Calendly Intent</span>
                  <p className="text-xs text-zinc-500 mt-1">
                    When these keywords are detected, the bot replies with your Calendly link.
                  </p>
                </div>
                <button
                  onClick={() => setCalendlyConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    calendlyConfig.enabled ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      calendlyConfig.enabled ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Calendly Keywords / Intents</label>
                  <input
                    type="text"
                    value={calendlyKeywordsInput}
                    onChange={(e) => setCalendlyKeywordsInput(e.target.value)}
                    placeholder="schedule, meeting, book call, calendly"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Comma-separated; when matched, the link is sent.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Calendly Link</label>
                  <input
                    type="url"
                    value={calendlyConfig.url}
                    onChange={(e) => setCalendlyConfig(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://calendly.com/your-link"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Prompt (before link)</label>
                  <input
                    type="text"
                    value={calendlyConfig.prompt}
                    onChange={(e) => setCalendlyConfig(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Here’s my calendar to pick a time:"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Disabled Message (optional)</label>
                  <input
                    type="text"
                    value={calendlyConfig.disabledMessage}
                    onChange={(e) => setCalendlyConfig(prev => ({ ...prev, disabledMessage: e.target.value }))}
                    placeholder="Scheduling is unavailable right now."
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCalendlyModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCalendlyConfig}
                  disabled={savingCalendlyConfig}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {savingCalendlyConfig ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2">
              <FaTrash size={20} />
              Delete Chatbot
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Are you sure you want to delete this chatbot? This will
              permanently delete all knowledge base files and conversation
              history. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingChatbotId(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChatbot}
                disabled={deletingChatbot}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingChatbot ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Chat Topic Dialog */}
      {showAutoChatDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <FaMagic size={20} className="text-emerald-600" />
              Start Auto-Chat
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Enter a topic for chatbots to discuss. All enabled chatbots will
              have LLM-based conversations about this topic.
            </p>
            <textarea
              placeholder="e.g., Dhurandhar movie - each scene and character analysis"
              value={autoChatTopic}
              onChange={(e) => setAutoChatTopic(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none mb-4"
            />
            <p className="text-xs text-zinc-500 mb-4">
              This is for testing/automation only. Regular chatbot conversations
              will continue using their persona and knowledge base.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAutoChatDialog(false);
                  setAutoChatTopic("");
                }}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartAutoChat}
                disabled={autoChatLoading || !autoChatTopic.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {autoChatLoading ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Starting...
                  </>
                ) : (
                  <>
                    <FaComments size={14} />
                    Start Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Chatbot Card Component
function ChatbotCard({
  chatbot,
  isToggling,
  onToggle,
  onDelete,
  onPersona,
  onKnowledgeBase,
  onStaticTemplates,
    onZohoCRM = () => {},
  onProposal = () => {},
  onCalendly = () => {},
  onToggleAutoChatExclusion,
  onToggleStaticTemplates,
  onToggleLeadKeywords,
  onToggleFollowUpKeywords,
  onSaveLeadKeywords,
  onSaveFollowUpKeywords,
  onToggleDisableFormatting,
}) {
  const readyFiles = (chatbot.knowledgeFiles || []).filter(
    (f) => f.status === "ready"
  ).length;
  const totalChunks = (chatbot.knowledgeFiles || []).reduce(
    (sum, f) => sum + (f.totalChunks || 0),
    0
  );

  const [leadKeywordsInput, setLeadKeywordsInput] = useState(
    chatbot.leadKeywords?.join(", ") || ""
  );
  const [followUpKeywordsInput, setFollowUpKeywordsInput] = useState(
    chatbot.followUpKeywords?.join(", ") || ""
  );

  return (
    <div
      className={`glass-card rounded-xl p-6 border-2 transition-all w-full ${
        chatbot.enabled
          ? "border-emerald-400 bg-emerald-50/30"
          : "border-zinc-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between ${
          chatbot.enabled ? "mb-6 pb-4 border-b border-zinc-200" : ""
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              chatbot.enabled ? "bg-emerald-100" : "bg-zinc-100"
            }`}
          >
            <FaRobot
              className={`w-6 h-6 ${
                chatbot.enabled ? "text-emerald-600" : "text-zinc-400"
              }`}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-zinc-900">
              {chatbot.phoneNumber}
            </p>
            <p className="text-sm text-zinc-500">{"gpt-4o-mini"}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              chatbot.enabled ? "text-emerald-600" : "text-zinc-500"
            }`}
          >
            {chatbot.enabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              chatbot.enabled ? "bg-emerald-500" : "bg-zinc-300"
            } ${
              isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${
                chatbot.enabled ? "transform translate-x-7" : ""
              }`}
            />
          </button>
          {isToggling && (
            <div className="absolute right-0 flex items-center justify-center pointer-events-none">
              <FaSpinner className="animate-spin text-emerald-600" size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Content Grid - Only show when chatbot is enabled */}
      {chatbot.enabled && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Left Column - Stats & Actions */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-200">
                <p className="text-2xl font-bold text-zinc-900">{readyFiles}</p>
                <p className="text-sm text-zinc-500 mt-1">Files</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-200">
                <p className="text-2xl font-bold text-zinc-900">
                  {totalChunks}
                </p>
                <p className="text-sm text-zinc-500 mt-1">Chunks</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={onPersona}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <FaUser size={14} />
                Persona
              </button>
              <button
                onClick={onKnowledgeBase}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <FaFileAlt size={14} />
                Knowledge Base
              </button>
              <button
                onClick={onStaticTemplates}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <FaFileAlt size={14} />
                Static Templates
              </button>
                    <button
              onClick={onZohoCRM}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <FaCog size={14} />
              Zoho CRM
            </button>
            <button
              onClick={onProposal}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <FaFileAlt size={14} />
              WhatsApp Proposal
            </button>
            <button
              onClick={onCalendly}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <FaLink size={14} />
              Calendly Intent
            </button>
            </div>
          </div>

          {/* Middle Column - Toggles */}
          <div className="space-y-4">
            {/* Static Templates Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-3">
                <FaFileAlt className="w-5 h-5 text-zinc-500" />
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">
                    Use Static Templates
                  </span>
                  {chatbot.useStaticTemplates && (
                    <span className="text-xs text-blue-600">
                      Fast keyword matching enabled
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onToggleStaticTemplates(
                    chatbot._id,
                    !chatbot.useStaticTemplates
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  chatbot.useStaticTemplates ? "bg-emerald-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    chatbot.useStaticTemplates ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {/* Auto-Chat Exclusion Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-3">
                <FaComments className="w-5 h-5 text-zinc-500" />
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">
                    Exclude from Auto-Chat
                  </span>
                  {chatbot.excludeFromAutoChat && (
                    <span className="text-xs text-zinc-500">
                      Using KB persona RAG during autochat
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onToggleAutoChatExclusion(
                    chatbot._id,
                    !chatbot.excludeFromAutoChat
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  chatbot.excludeFromAutoChat ? "bg-emerald-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    chatbot.excludeFromAutoChat ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
            {/* Disable Formatting Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-3">
                <FaBrain className="w-5 h-5 text-zinc-500" />
                <div>
                  <span className="text-sm font-medium text-zinc-900 block">
                    Disable Formatting
                  </span>
                  {chatbot.disableFormatting ? (
                    <span className="text-xs text-orange-600">
                      Short paragraphs only, no lists
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      Using bullet points & lists
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onToggleDisableFormatting(
                    chatbot._id,
                    !chatbot.disableFormatting
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  chatbot.disableFormatting ? "bg-orange-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    chatbot.disableFormatting ? "transform translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Column - Keywords */}
          <div className="space-y-4">
            {/* Lead Keywords Toggle */}
            <div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 mb-3">
                <div className="flex items-center gap-3">
                  <FaUser className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-900">
                    Lead Keyword Capture
                  </span>
                </div>
                <button
                  onClick={() =>
                    onToggleLeadKeywords(
                      chatbot._id,
                      !chatbot.leadKeywordsEnabled
                    )
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    chatbot.leadKeywordsEnabled
                      ? "bg-emerald-500"
                      : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      chatbot.leadKeywordsEnabled
                        ? "transform translate-x-6"
                        : ""
                    }`}
                  />
                </button>
              </div>
              {chatbot.leadKeywordsEnabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="interested, pricing, quote, demo"
                    value={leadKeywordsInput}
                    onChange={(e) => setLeadKeywordsInput(e.target.value)}
                    onBlur={() => {
                      const keywords = leadKeywordsInput
                        .split(",")
                        .map((k) => k.trim())
                        .filter((k) => k.length > 0);
                      onSaveLeadKeywords(chatbot._id, keywords);
                    }}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-zinc-500 px-1">
                    Keywords that indicate customer interest (comma-separated)
                  </p>
                </div>
              )}
            </div>

            {/* Follow-up Keywords Toggle */}
            <div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 mb-3">
                <div className="flex items-center gap-3">
                  <FaRedo className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-900">
                    Follow-up Keyword Capture
                  </span>
                </div>
                <button
                  onClick={() =>
                    onToggleFollowUpKeywords(
                      chatbot._id,
                      !chatbot.followUpKeywordsEnabled
                    )
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    chatbot.followUpKeywordsEnabled
                      ? "bg-emerald-500"
                      : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      chatbot.followUpKeywordsEnabled
                        ? "transform translate-x-6"
                        : ""
                    }`}
                  />
                </button>
              </div>
              {chatbot.followUpKeywordsEnabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="callback, later, tomorrow, busy"
                    value={followUpKeywordsInput}
                    onChange={(e) => setFollowUpKeywordsInput(e.target.value)}
                    onBlur={() => {
                      const keywords = followUpKeywordsInput
                        .split(",")
                        .map((k) => k.trim())
                        .filter((k) => k.length > 0);
                      onSaveFollowUpKeywords(chatbot._id, keywords);
                    }}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-zinc-500 px-1">
                    Keywords that indicate customer needs follow-up
                    (comma-separated)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Button */}
      <div
        className={`flex justify-end ${
          chatbot.enabled ? "pt-4 mt-4 border-t border-zinc-200" : "mt-4"
        }`}
      >
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-red-200"
        >
          <FaTrash size={14} />
          Delete Chatbot
        </button>
      </div>
    </div>
  );
}

export default ManageChatbot;
