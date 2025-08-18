import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  Avatar,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Add as AddIcon,
  Groups as CommunityIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import ClarificationUI from '../components/ClarificationUI';
import ContextIndicator from '../components/Workspace/ContextIndicator';
import TextSelectionMenu from '../components/Workspace/TextSelectionMenu';
import PipelineInfoDialog from '../components/Chat/PipelineInfoDialog';
import ContextControlPanel from '../components/Workspace/ContextControlPanel';
import CreateFromContextButton from '../components/Workspace/CreateFromContextButton';
import CommunityEscalationModal from '../components/Community/CommunityEscalationModal';
import ScreenshotUpload from '../components/Chat/ScreenshotUpload';
import { useTimelineCapture } from '../hooks/useTimelineCapture'; // NEU: Timeline-Integration
import { chatApi, ContextSettings } from '../services/chatApi';
import { userApi } from '../services/userApi';
import { useTextSelection } from '../hooks/useTextSelection';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: any;
}

// CR-CS30: Extended interface for CS30 additional responses
interface MessageWithCs30 extends Message {
  cs30AdditionalResponse?: Message;
  hasCs30Additional?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ClarificationResult {
  needsClarification: boolean;
  ambiguityScore: number;
  detectedTopics: string[];
  suggestedQuestions: Array<{
    id: string;
    question: string;
    category: 'scope' | 'context' | 'detail_level' | 'stakeholder' | 'energy_type';
    options?: string[];
    priority: number;
  }>;
  reasoning: string;
  sessionId?: string;
}

const Chat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { showSnackbar } = useSnackbar();
  const { captureActivity } = useTimelineCapture(); // NEU: Timeline-Integration
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [loadingElapsed, setLoadingElapsed] = useState<number>(0);
  const [chatLoading, setChatLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingClarification, setPendingClarification] = useState<ClarificationResult | null>(null);
  const [clarificationLoading, setClarificationLoading] = useState(false);
  
  // Context Settings State
  const [contextSettings, setContextSettings] = useState<ContextSettings>({
    useWorkspaceOnly: false,
    workspacePriority: 'medium',
    includeUserDocuments: true,
    includeUserNotes: true,
    includeSystemKnowledge: true,
    includeM2CRoles: true,
  });
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  
  // Community escalation state
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  
  // CR-CS30: State for CS30 toggle functionality
  const [userHasCs30Access, setUserHasCs30Access] = useState(false);
  const [showCs30Mode, setShowCs30Mode] = useState(false); // false = normal mode, true = cs30 mode
  
  // Screenshot functionality state
  const [attachedScreenshot, setAttachedScreenshot] = useState<File | null>(null);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<any>(null);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Text selection for creating notes
  const textSelection = useTextSelection({
    sourceType: 'chat',
    sourceId: chatId || null,
    containerId: 'chat-messages-container',
    ready: !chatLoading && messages.length > 0 // Wait for chat to load and have messages
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Timer effect for loading elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (loading && loadingStartTime) {
      interval = setInterval(() => {
        setLoadingElapsed(Math.floor((Date.now() - loadingStartTime) / 1000));
      }, 1000);
    } else {
      setLoadingElapsed(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, loadingStartTime]);

  useEffect(() => {
    fetchChats();
    // CR-CS30: Check user's CS30 access on component mount
    checkUserCs30Access();
  }, []);

  // CR-CS30: Function to check if user has CS30 access
  const checkUserCs30Access = async () => {
    try {
      const userProfile = await userApi.getUserProfile();
      setUserHasCs30Access(!!userProfile.can_access_cs30);
      console.log('User CS30 access:', !!userProfile.can_access_cs30);
    } catch (error) {
      console.error('Error checking CS30 access:', error);
      setUserHasCs30Access(false);
    }
  };

  useEffect(() => {
    if (chatId) {
      fetchChat(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    console.log('Messages state updated:', messages.length, 'messages');
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      console.log('Fetching chats...');
      const chats = await chatApi.getChats();
      console.log('Chats fetched:', chats);
      setChats(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Fehler beim Laden der Chats');
    }
  };

  const fetchChat = async (id: string) => {
    try {
      console.log('Fetching chat:', id);
      setChatLoading(true);
      // Reset loading state for message sending when switching chats
      setLoading(false);
      setIsTyping(false);
      // Reset any pending clarifications when switching chats
      setPendingClarification(null);
      
      const chatData = await chatApi.getChat(id);
      console.log('Chat fetched:', chatData);
      setCurrentChat(chatData.chat);
      
      // Ensure messages is always an array
      const messagesData = chatData.messages || [];
      console.log('Setting messages:', messagesData);
      setMessages(messagesData);
      setError(null);
    } catch (error) {
      console.error('Error fetching chat:', error);
      setError('Fehler beim Laden des Chats');
      setMessages([]); // Reset messages on error
    } finally {
      console.log('Setting chatLoading to false');
      setChatLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      console.log('Creating new chat...');
      const newChat = await chatApi.createChat('Neuer Chat');
      console.log('New chat created:', newChat);
      setChats([newChat, ...chats]);
      setCurrentChat(newChat);
      
      // Explicitly reset all relevant states
      setMessages([]);
      setLoading(false);
      setIsTyping(false);
      setPendingClarification(null);
      setError(null);
      setChatLoading(false);
      
      console.log('New chat state initialized');
      window.history.pushState({}, '', `/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      showSnackbar('Fehler beim Erstellen des Chats', 'error');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !attachedScreenshot) || !currentChat || loading) {
      return;
    }

    const messageContent = newMessage.trim();
    const screenshotFile = attachedScreenshot;
    const analysis = screenshotAnalysis;
    
    setNewMessage('');
    setAttachedScreenshot(null);
    setScreenshotAnalysis(null);
    setShowScreenshotUpload(false);
    setLoading(true);
    setLoadingStartTime(Date.now());
    setIsTyping(true);

    console.log('Sending message:', messageContent, 'with screenshot:', !!screenshotFile);

    try {
      let response;
      
      if (screenshotFile) {
        // Send message with screenshot
        response = await chatApi.sendMessageWithScreenshot(
          currentChat.id, 
          messageContent, 
          screenshotFile,
          analysis,
          contextSettings
        );
      } else {
        // Send regular message
        response = await chatApi.sendMessage(currentChat.id, messageContent, contextSettings);
      }

      console.log('API Response:', response);

      // The chatApi returns the data directly, no need to access .data.data
      const { userMessage, assistantMessage, updatedChatTitle, type, cs30AdditionalResponse, hasCs30Additional } = response;
      
      // Validate required fields
      if (!userMessage || !assistantMessage) {
        throw new Error('Invalid response format: missing userMessage or assistantMessage');
      }

      // CR-CS30: Log CS30 additional response if present
      if (hasCs30Additional && cs30AdditionalResponse) {
        console.log('CS30 additional response received:', cs30AdditionalResponse);
      }

      console.log('User message:', userMessage);
      console.log('Assistant message:', assistantMessage);
      console.log('Response type:', type);
      
      // Always add user message first, regardless of response type
      setMessages(prev => {
        console.log('Adding user message to state:', userMessage);
        return [...prev, userMessage];
      });
      
      // Handle clarification response
      if (type === 'clarification' && assistantMessage.metadata?.type === 'clarification') {
        // Parse clarification data from message content
        const clarificationData = JSON.parse(assistantMessage.content);
        setPendingClarification(clarificationData.clarificationResult);
        console.log('Clarification pending, assistant message not added to display');
      } else {
        // Normal response - add assistant message
        setMessages(prev => {
          console.log('Adding assistant message to state:', assistantMessage);
          
          // CR-CS30: Add CS30 additional response to the assistant message if available
          const enrichedAssistantMessage = hasCs30Additional ? {
            ...assistantMessage,
            cs30AdditionalResponse: cs30AdditionalResponse,
            hasCs30Additional: true
          } : assistantMessage;
          
          return [...prev, enrichedAssistantMessage];
        });
        setPendingClarification(null);
      }
      
      // Update chat in the list and current chat if title was updated
      if (updatedChatTitle) {
        console.log('Updating chat title:', updatedChatTitle);
        const updatedChat = { ...currentChat, title: updatedChatTitle, updated_at: new Date().toISOString() };
        setCurrentChat(updatedChat);
        setChats(prev => prev.map(chat => 
          chat.id === currentChat.id 
            ? updatedChat
            : chat
        ));
      } else {
        // Update chat timestamp
        setChats(prev => prev.map(chat => 
          chat.id === currentChat.id 
            ? { ...chat, updated_at: new Date().toISOString() }
            : chat
        ));
      }

      console.log('Message sent successfully');

      // Timeline-Integration: Chat-Aktivität erfassen
      try {
        await captureActivity('chat', 'message', {
          chatId: currentChat.id,
          chatTitle: currentChat.title,
          userMessage: messageContent,
          assistantMessage: assistantMessage.content,
          messageType: type,
          hasCs30Additional: hasCs30Additional,
          contextSettings: contextSettings,
          timestamp: new Date().toISOString()
        });
        console.log('Chat activity captured to timeline');
      } catch (timelineError) {
        console.error('Failed to capture chat activity to timeline:', timelineError);
        // Timeline-Fehler sollen den Chat-Flow nicht blockieren
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Restore the message input if there was an error
      setNewMessage(messageContent);
      
      if (error?.message === 'Request timeout') {
        showSnackbar('Anfrage ist abgelaufen. Bitte versuchen Sie es erneut.', 'error');
      } else {
        showSnackbar('Fehler beim Senden der Nachricht', 'error');
      }
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
      setLoadingStartTime(null);
      setIsTyping(false);
    }
  };

  const handleClarificationPreferenceSubmit = async (responses: { questionId: string; answer: string }[]) => {
    try {
      const preferencesToUpdate: { [key: string]: string } = responses.reduce((acc, r) => {
        acc[r.questionId] = r.answer;
        return acc;
      }, {} as { [key: string]: string });
      
      await userApi.updateFlipModePreferences(preferencesToUpdate);
      showSnackbar('Flip Mode Voreinstellungen gespeichert.', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Flip Mode Voreinstellungen:', error);
      showSnackbar('Fehler beim Speichern der Voreinstellungen.', 'error');
    }
  };

  const handleClarificationSubmit = async (responses?: { questionId: string; answer: string }[]) => {
    if (!currentChat || !pendingClarification) {
      showSnackbar('Fehler: Keine aktive Clarification-Session', 'error');
      return;
    }

    setClarificationLoading(true);

    try {
      // Get the original query from the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const originalQuery = lastUserMessage?.content || '';

      const response = await chatApi.generateResponse(currentChat.id, originalQuery, responses);

      console.log('Clarification response:', response);

      if (response.assistantMessage) {
        setMessages(prev => [...prev, response.assistantMessage]);
        setPendingClarification(null);
        showSnackbar('Präzisierte Antwort erhalten!', 'success');
      }
    } catch (error) {
      console.error('Error submitting clarification:', error);
      showSnackbar('Fehler beim Verarbeiten der Präzisierung', 'error');
    } finally {
      setClarificationLoading(false);
    }
  };

  const handleClarificationSkip = () => {
    // TODO: Implement skip functionality - generate response without clarification
    setPendingClarification(null);
    showSnackbar('Präzisierung übersprungen', 'info');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', gap: 2 }}>
      {/* Chat List Sidebar */}
      <Paper sx={{ width: 300, p: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Chats</Typography>
          <IconButton onClick={createNewChat} color="primary">
            <AddIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          {chats.map((chat) => (
            <ListItem
              key={chat.id}
              sx={{
                cursor: 'pointer',
                borderRadius: 1,
                mb: 1,
                backgroundColor: currentChat?.id === chat.id ? 'primary.light' : 'transparent',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
              onClick={() => {
                setCurrentChat(chat);
                // Reset loading states when switching chats
                setLoading(false);
                setIsTyping(false);
                fetchChat(chat.id);
                window.history.pushState({}, '', `/chat/${chat.id}`);
              }}
            >
              <Box sx={{ width: '100%', overflow: 'hidden' }}>
                <Tooltip title={chat.title} arrow>
                  <Typography 
                    variant="subtitle2" 
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      display: 'block'
                    }}
                  >
                    {chat.title}
                  </Typography>
                </Tooltip>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(chat.updated_at)}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Chat Area */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        
        {!currentChat ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <BotIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Wählen Sie einen Chat oder starten Sie ein neues Gespräch mit Mako Willi
              </Typography>
              <Button
                variant="contained"
                onClick={createNewChat}
                sx={{ mt: 2 }}
                startIcon={<AddIcon />}
              >
                Neuen Chat mit Mako Willi starten
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            {/* Chat Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">{currentChat.title}</Typography>
                
                {/* CR-CS30: Toggle Switch for CS30 Mode */}
                {userHasCs30Access && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Normale
                    </Typography>
                    <Box
                      sx={{
                        width: 40,
                        height: 20,
                        backgroundColor: showCs30Mode ? 'primary.main' : 'grey.300',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: showCs30Mode ? 'primary.dark' : 'grey.400',
                        }
                      }}
                      onClick={() => {
                        console.log('CS30 Toggle clicked:', !showCs30Mode);
                        setShowCs30Mode(!showCs30Mode);
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: 2,
                          left: showCs30Mode ? 22 : 2,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      CS30
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Context Control Panel */}
            <Box sx={{ px: 2, pt: 2 }}>
              <ContextControlPanel
                contextSettings={contextSettings}
                onSettingsChange={setContextSettings}
                isOpen={contextPanelOpen}
                onToggle={() => setContextPanelOpen(!contextPanelOpen)}
              />
            </Box>

            {/* Messages */}
            <Box 
              id="chat-messages-container"
              sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 0 }}
            >
              {chatLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {messages.length === 0 ? (
                    <ListItem>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ textAlign: 'center', width: '100%' }}
                      >
                        Starten Sie ein Gespräch mit Willi Mako
                      </Typography>
                    </ListItem>
                  ) : (
                    messages.map((message) => (
                      <ListItem
                        key={`${message.id}-${message.role}-${message.created_at}`}
                        sx={{
                          alignItems: 'flex-start',
                          mb: 2,
                          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar
                          sx={{
                            mx: 1,
                            bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                          }}
                        >
                          {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                        </Avatar>
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: '70%',
                            bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                          color: message.role === 'user' ? 'white' : 'text.primary',
                        }}
                      >
                        {message.role === 'user' ? (
                          <Typography 
                            variant="body1" 
                            sx={{ whiteSpace: 'pre-wrap' }}
                            className="chat-message user-message"
                          >
                            {message.content}
                          </Typography>
                        ) : (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Box sx={{ flex: 1 }}>
                                <div className="chat-message assistant-message">
                                  <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <Typography variant="body1" sx={{ mb: 1 }}>
                                    {children}
                                  </Typography>
                                ),
                                h1: ({ children }) => (
                                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    {children}
                                  </Typography>
                                ),
                                h2: ({ children }) => (
                                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    {children}
                                  </Typography>
                                ),
                                h3: ({ children }) => (
                                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    {children}
                                  </Typography>
                                ),
                                ul: ({ children }) => (
                                  <Box component="ul" sx={{ mb: 1, pl: 2 }}>
                                    {children}
                                  </Box>
                                ),
                                ol: ({ children }) => (
                                  <Box component="ol" sx={{ mb: 1, pl: 2 }}>
                                    {children}
                                  </Box>
                                ),
                                li: ({ children }) => (
                                  <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                                    {children}
                                  </Typography>
                                ),
                                strong: ({ children }) => (
                                  <Typography component="strong" sx={{ fontWeight: 'bold' }}>
                                    {children}
                                  </Typography>
                                ),
                                em: ({ children }) => (
                                  <Typography component="em" sx={{ fontStyle: 'italic' }}>
                                    {children}
                                  </Typography>
                                ),
                                code: ({ children }) => (
                                  <Typography
                                    component="code"
                                    sx={{
                                      backgroundColor: 'rgba(0,0,0,0.1)',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                      fontSize: '0.9em',
                                    }}
                                  >
                                    {children}
                                  </Typography>
                                ),
                                pre: ({ children }) => (
                                  <Paper
                                    sx={{
                                      p: 1,
                                      backgroundColor: 'rgba(0,0,0,0.1)',
                                      overflow: 'auto',
                                      mb: 1,
                                    }}
                                  >
                                    <Typography
                                      component="pre"
                                      sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.9em',
                                        whiteSpace: 'pre-wrap',
                                        margin: 0,
                                      }}
                                    >
                                      {children}
                                    </Typography>
                                  </Paper>
                                ),
                                blockquote: ({ children }) => (
                                  <Paper
                                    sx={{
                                      p: 1,
                                      borderLeft: '4px solid',
                                      borderLeftColor: 'primary.main',
                                      backgroundColor: 'rgba(0,0,0,0.05)',
                                      mb: 1,
                                    }}
                                  >
                                    {children}
                                  </Paper>
                                ),
                              }}
                            >
                              {/* CR-CS30: Toggle-based content display */}
                              {(() => {
                                const messageWithCs30 = message as MessageWithCs30;
                                const hasCs30Response = messageWithCs30.cs30AdditionalResponse;
                                const shouldShowCs30 = userHasCs30Access && showCs30Mode && hasCs30Response;
                                const contentToShow = shouldShowCs30 
                                  ? messageWithCs30.cs30AdditionalResponse?.content || message.content
                                  : message.content;
                                const isCs30Content = shouldShowCs30;

                                // Debug logging
                                if (message.role === 'assistant') {
                                  console.log('Message render debug:', {
                                    messageId: message.id,
                                    userHasCs30Access,
                                    showCs30Mode,
                                    hasCs30Response: !!hasCs30Response,
                                    shouldShowCs30,
                                    contentPreview: contentToShow?.substring(0, 50) + '...',
                                    cs30ContentPreview: messageWithCs30.cs30AdditionalResponse?.content?.substring(0, 50) + '...'
                                  });
                                }

                                return contentToShow;
                              })()}
                            </ReactMarkdown>
                            
                            {/* CR-CS30: Display indicator and source info outside ReactMarkdown */}
                            {(() => {
                              const messageWithCs30 = message as MessageWithCs30;
                              const hasCs30Response = messageWithCs30.cs30AdditionalResponse;
                              const shouldShowCs30 = userHasCs30Access && showCs30Mode && hasCs30Response;
                              const isCs30Content = shouldShowCs30;

                              if (!userHasCs30Access || !hasCs30Response) {
                                return null;
                              }

                              return (
                                <Box sx={{ mt: 1 }}>
                                  {/* Display toggle indicator - smaller styling */}
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      display: 'inline-block',
                                      mb: 1,
                                      px: 0.8,
                                      py: 0.3,
                                      backgroundColor: isCs30Content ? 'primary.light' : 'grey.200',
                                      color: isCs30Content ? 'primary.contrastText' : 'text.secondary',
                                      borderRadius: 1,
                                      fontWeight: 'medium',
                                      fontSize: '0.65rem'
                                    }}
                                  >
                                    {isCs30Content ? 'Schleupen-Dokumentation' : 'Allgemeine Wissensbasis'}
                                  </Typography>
                                  
                                  {/* CS30 Source Information - smaller styling */}
                                  {isCs30Content && messageWithCs30.cs30AdditionalResponse?.metadata?.sources && (
                                    <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderTopColor: 'divider' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                        Quellen: {messageWithCs30.cs30AdditionalResponse.metadata.sourceCount} Schleupen-Dokument(e)
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })()}
                                </div>
                              </Box>
                              
                              {/* Pipeline Info Button for assistant messages */}
                              {message.metadata && (message.metadata.reasoningSteps || message.metadata.pipelineDecisions) && (
                                <PipelineInfoDialog 
                                  pipelineInfo={{
                                    contextSources: message.metadata.contextSources || 0,
                                    userContextUsed: message.metadata.userContextUsed || false,
                                    contextReason: message.metadata.contextReason || '',
                                    reasoningSteps: message.metadata.reasoningSteps || [],
                                    finalQuality: message.metadata.finalQuality || 0,
                                    iterationsUsed: message.metadata.iterationsUsed || 0,
                                    qdrantQueries: message.metadata.qdrantQueries || 0,
                                    qdrantResults: message.metadata.qdrantResults || 0,
                                    semanticClusters: message.metadata.semanticClusters || 0,
                                    pipelineDecisions: message.metadata.pipelineDecisions || {},
                                    qaAnalysis: message.metadata.qaAnalysis || {},
                                    contextAnalysis: message.metadata.contextAnalysis || {}
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                        
                        {/* Context Indicator for assistant messages */}
                        {message.role !== 'user' && message.metadata && (
                          <ContextIndicator
                            contextInfo={message.metadata.userContextUsed ? {
                              userContextUsed: message.metadata.userContextUsed || false,
                              userDocumentsUsed: message.metadata.userDocumentsUsed || 0,
                              userNotesUsed: message.metadata.userNotesUsed || 0,
                              contextSummary: message.metadata.contextSummary || '',
                              contextReason: message.metadata.contextReason || '',
                              suggestedDocuments: message.metadata.suggestedDocuments || [],
                              relatedNotes: message.metadata.relatedNotes || []
                            } : null}
                          />
                        )}
                        
                        {/* Bilaterale Klärung Button für längere Assistant-Nachrichten - moved outside message box */}
                        {message.role === 'assistant' && message.content.length > 100 && (
                          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <CreateFromContextButton
                              variant="chip"
                              size="small"
                              context={{
                                source: 'chat',
                                chatContext: {
                                  chatId: currentChat?.id || '',
                                  messageId: message.id,
                                  content: message.content,
                                  timestamp: message.created_at,
                                  role: message.role,
                                  metadata: message.metadata
                                }
                              }}
                            />
                          </Box>
                        )}
                        
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            opacity: 0.7,
                          }}
                        >
                          {formatTime(message.created_at)}
                        </Typography>
                      </Paper>
                    </ListItem>
                    ))
                  )}
                  
                  {/* Clarification UI */}
                  {pendingClarification && (
                    <ListItem sx={{ alignItems: 'flex-start', mb: 2, px: 0 }}>
                      <ClarificationUI
                        clarificationResult={pendingClarification}
                        onSubmit={handleClarificationPreferenceSubmit}
                        onGenerate={handleClarificationSubmit}
                        onSkip={handleClarificationSkip}
                        loading={clarificationLoading}
                      />
                    </ListItem>
                  )}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <ListItem
                      sx={{
                        alignItems: 'flex-start',
                        mb: 2,
                        flexDirection: 'row',
                      }}
                    >
                      <Avatar
                        sx={{
                          mx: 1,
                          bgcolor: 'secondary.main',
                        }}
                      >
                        <BotIcon />
                      </Avatar>
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor: 'grey.100',
                          color: 'text.primary',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            Mako Willi analysiert... 
                            {loadingElapsed > 0 && (
                              <span style={{ color: '#666', marginLeft: '8px' }}>
                                ({loadingElapsed}s)
                              </span>
                            )}
                            {loadingElapsed > 30 && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                Komplexe Anfrage wird verarbeitet...
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      </Paper>
                    </ListItem>
                  )}
                  
                  <div ref={messagesEndRef} />
                </List>
              )}
            </Box>

            {/* Message Input */}
            <Box
              component="form"
              onSubmit={sendMessage}
              sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}
            >
              {/* Screenshot Upload Area */}
              {showScreenshotUpload && (
                <Box sx={{ mb: 2 }}>
                  <ScreenshotUpload
                    onScreenshotUploaded={(file, analysis) => {
                      setAttachedScreenshot(file);
                      setScreenshotAnalysis(analysis);
                    }}
                    onScreenshotRemoved={() => {
                      setAttachedScreenshot(null);
                      setScreenshotAnalysis(null);
                    }}
                    disabled={loading}
                  />
                </Box>
              )}

              {/* Screenshot Info Display */}
              {attachedScreenshot && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
                    📷 Screenshot anhängend: {attachedScreenshot.name}
                    {screenshotAnalysis?.isSchleupnCS30 && (
                      <Box component="span" sx={{ ml: 1, fontWeight: 'bold' }}>
                        (Schleupen CS 3.0 erkannt)
                      </Box>
                    )}
                  </Typography>
                  {screenshotAnalysis?.errorMessages?.length > 0 && (
                    <Typography variant="caption" sx={{ color: 'primary.contrastText', display: 'block', mt: 0.5 }}>
                      🚨 {screenshotAnalysis.errorMessages.length} Fehlermeldung(en) erkannt
                    </Typography>
                  )}
                </Box>
              )}

              {/* Community Escalation Button */}
              {messages.length > 0 && (
                <Box sx={{ mb: 1, textAlign: 'center' }}>
                  <Button
                    size="small"
                    startIcon={<CommunityIcon />}
                    onClick={() => setEscalationModalOpen(true)}
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      '&:hover': {
                        backgroundColor: '#ee7f4b', // Community theme orange
                        color: 'white',
                      }
                    }}
                  >
                    In Community analysieren
                  </Button>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={
                      attachedScreenshot 
                        ? "Beschreiben Sie Ihr Problem mit diesem Screenshot..." 
                        : "Fragen Sie Mako Willi etwas über die Energiewirtschaft..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />
                </Box>
                
                {/* Screenshot Button */}
                <IconButton
                  onClick={() => setShowScreenshotUpload(!showScreenshotUpload)}
                  color={showScreenshotUpload || attachedScreenshot ? 'primary' : 'default'}
                  disabled={loading}
                  sx={{ 
                    height: 56, // Match TextField height
                    width: 56,
                    bgcolor: showScreenshotUpload || attachedScreenshot ? 'primary.light' : 'transparent',
                    '&:hover': {
                      bgcolor: showScreenshotUpload || attachedScreenshot ? 'primary.main' : 'action.hover',
                    }
                  }}
                >
                  <PhotoCameraIcon />
                </IconButton>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || (!newMessage.trim() && !attachedScreenshot)}
                  sx={{ minWidth: 'auto', px: 2, height: 56 }}
                >
                  {loading ? <CircularProgress size={24} /> : <SendIcon />}
                </Button>
              </Box>
            </Box>
          </>
        )}
        
        {/* Text Selection Menu */}
        <TextSelectionMenu
          anchorEl={textSelection.anchorEl}
          selectedText={textSelection.selectedText}
          sourceType={textSelection.sourceType}
          sourceId={textSelection.sourceId}
          sourceContext={textSelection.sourceContext}
          onClose={textSelection.onClose}
        />

        {/* Community Escalation Modal */}
        <CommunityEscalationModal
          open={escalationModalOpen}
          onClose={() => setEscalationModalOpen(false)}
          messages={messages}
          chatId={chatId}
        />
      </Paper>
    </Box>
  );
};

export default Chat;