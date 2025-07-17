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
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const Chat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { showSnackbar } = useSnackbar();
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChat(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await axios.get('/chat/chats');
      setChats(response.data.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Fehler beim Laden der Chats');
    }
  };

  const fetchChat = async (id: string) => {
    try {
      setChatLoading(true);
      const response = await axios.get(`/chat/chats/${id}`);
      setCurrentChat(response.data.data.chat);
      setMessages(response.data.data.messages || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching chat:', error);
      setError('Fehler beim Laden des Chats');
    } finally {
      setChatLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await axios.post('/chat/chats', { 
        title: 'Neuer Chat' 
      });
      const newChat = response.data.data;
      setChats([newChat, ...chats]);
      setCurrentChat(newChat);
      setMessages([]);
      window.history.pushState({}, '', `/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      showSnackbar('Fehler beim Erstellen des Chats', 'error');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentChat || loading) {
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`/chat/chats/${currentChat.id}/messages`, {
        content: messageContent
      });

      const { userMessage, assistantMessage, updatedChatTitle } = response.data.data;
      
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // Update chat in the list and current chat if title was updated
      if (updatedChatTitle) {
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

    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Fehler beim Senden der Nachricht', 'error');
    } finally {
      setLoading(false);
    }
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
              <Typography variant="h6">{currentChat.title}</Typography>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {chatLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {messages.map((message) => (
                    <ListItem
                      key={message.id}
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
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>
                        ) : (
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
                            {message.content}
                          </ReactMarkdown>
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
                  ))}
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Fragen Sie Mako Willi etwas über die Energiewirtschaft..."
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
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !newMessage.trim()}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : <SendIcon />}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Chat;
