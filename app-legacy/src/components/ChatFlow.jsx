import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Send as SendIcon, 
  Settings as SettingsIcon,
  EmojiObjects as HydeIcon,
  FilterAlt as FilterIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import { sendMessage, clearChatHistory } from '../actions/chatActions';
import Message from './Message';
import ChatContextDisplay from './ChatContextDisplay';
import OptimizedSearchService from '../services/OptimizedSearchService';
import ContextExtractionService from '../services/ContextExtractionService';
import './ChatFlow.css';

const ChatFlow = () => {
  const dispatch = useDispatch();
  const messages = useSelector(state => state.chat.messages);
  const loading = useSelector(state => state.chat.loading);
  const user = useSelector(state => state.auth.user);
  
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    useHyDE: true,
    useFilters: true,
    useOptimizations: true,
    scoreThreshold: 0.6,
    collectionName: 'cs30'
  });
  
  // Message container ref for scrolling
  const messagesEndRef = React.useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Show user message immediately
    const userMessageId = Date.now().toString();
    dispatch(sendMessage({
      id: userMessageId,
      sender: user?.name || 'Benutzer',
      text: inputValue,
      timestamp: new Date().toISOString(),
      isUser: true
    }));
    
    // Clear input
    setInputValue('');
    
    try {
      // 1. Perform optimized search with the enhanced services
      const searchResult = await OptimizedSearchService.search(
        inputValue,
        {
          useHyDE: searchOptions.useHyDE,
          useFilters: searchOptions.useFilters,
          useOptimizations: searchOptions.useOptimizations,
          scoreThreshold: searchOptions.scoreThreshold,
          collectionName: searchOptions.collectionName,
          includeMetadata: true,
          useCache: true,
          debug: false
        }
      );
      
      // 2. Extract and format context with the enhanced service
      const context = ContextExtractionService.extractContext(
        searchResult.results, 
        searchOptions.collectionName
      );
      
      // 3. Send to server for response generation with enhanced metadata
      const responseData = await sendChatRequest(
        inputValue, 
        context.rawText, 
        {
          queryInfo: searchResult.query,
          metrics: searchResult.metrics,
          sources: context.sources,
          sections: context.sections,
          collectionName: searchOptions.collectionName
        }
      );
      
      // 4. Display response with enhanced context display
      dispatch(sendMessage({
        id: Date.now().toString(),
        sender: 'Willi',
        text: responseData.text,
        timestamp: new Date().toISOString(),
        isUser: false,
        context: searchResult.results,
        queryInfo: searchResult.query,
        sources: context.sources,
        searchMetrics: searchResult.metrics
      }));
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Genauere Fehleranalyse
      let errorMessage = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.';
      
      if (error.response) {
        // Server antwortete mit Fehlercode
        console.error('Server error:', error.response.status, error.response.data);
        
        if (error.response.status === 400) {
          errorMessage = 'Die Anfrage konnte nicht richtig verarbeitet werden. Bitte formulieren Sie Ihre Frage anders.';
        } else if (error.response.status === 404) {
          errorMessage = 'Die gesuchte Information wurde nicht gefunden. Bitte versuchen Sie eine andere Frage.';
        } else if (error.response.status === 503) {
          errorMessage = 'Der Dienst ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.';
        }
      } else if (error.request) {
        // Keine Antwort vom Server
        console.error('No response from server');
        errorMessage = 'Keine Antwort vom Server. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else {
        // Fehler bei der Anfrageerstellung
        console.error('Request error:', error.message);
      }
      
      // Show specific error message
      dispatch(sendMessage({
        id: Date.now().toString(),
        sender: 'System',
        text: errorMessage,
        timestamp: new Date().toISOString(),
        isUser: false,
        isError: true
      }));
    }
  };
  
  // Send chat request to server
  const sendChatRequest = async (query, context, metadata) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          context,
          metadata,
          // Timeout für die Anfrage erhöhen
          timeout: 30000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`Failed to get chat response: ${response.statusText}`);
        error.response = response;
        error.responseData = errorData;
        throw error;
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in chat request:', error);
      throw error;
    }
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Update search options
  const handleOptionChange = (e) => {
    const { name, checked, value, type } = e.target;
    setSearchOptions({
      ...searchOptions,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Clear chat history
  const handleClearChat = () => {
    if (window.confirm('Möchten Sie wirklich den gesamten Chat-Verlauf löschen?')) {
      dispatch(clearChatHistory());
    }
  };
  
  return (
    <Box className="chat-flow-container">
      <Box className="chat-header">
        <Typography variant="h6">Chat mit Willi</Typography>
        <Box>
          <Tooltip title="Einstellungen">
            <Button 
              size="small" 
              variant="outlined" 
              onClick={toggleSettings}
              startIcon={<SettingsIcon />}
            >
              Einstellungen
            </Button>
          </Tooltip>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleClearChat}
            sx={{ ml: 1 }}
          >
            Chat löschen
          </Button>
        </Box>
      </Box>
      
      {showSettings && (
        <Box className="chat-settings">
          <Typography variant="subtitle2" gutterBottom>
            Suchoptionen
          </Typography>
          <Box className="settings-options">
            <FormControlLabel
              control={
                <Switch 
                  checked={searchOptions.useHyDE} 
                  onChange={handleOptionChange}
                  name="useHyDE"
                />
              }
              label={
                <Box className="setting-label">
                  <span>HyDE</span>
                  <Tooltip title="Hypothetical Document Embeddings - Verbessert die semantische Suche durch Generierung hypothetischer Antworten">
                    <HydeIcon fontSize="small" />
                  </Tooltip>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={searchOptions.useFilters} 
                  onChange={handleOptionChange}
                  name="useFilters"
                />
              }
              label={
                <Box className="setting-label">
                  <span>Intelligente Filter</span>
                  <Tooltip title="Automatische Filterung basierend auf Anfrageanalyse">
                    <FilterIcon fontSize="small" />
                  </Tooltip>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={searchOptions.useOptimizations} 
                  onChange={handleOptionChange}
                  name="useOptimizations"
                />
              }
              label={
                <Box className="setting-label">
                  <span>Optimierungen</span>
                  <Tooltip title="Verwendung aller Optimierungstechniken für bessere Ergebnisse">
                    <TuneIcon fontSize="small" />
                  </Tooltip>
                </Box>
              }
            />
            
            <Box className="collection-selector" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2 }}>Datenquelle:</Typography>
              <select 
                name="collectionName"
                value={searchOptions.collectionName}
                onChange={e => setSearchOptions({
                  ...searchOptions,
                  collectionName: e.target.value
                })}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="cs30">CS/30 Software</option>
                <option value="willi_mako">Marktkommunikation</option>
              </select>
            </Box>
          </Box>
        </Box>
      )}
      
      <Box className="messages-container">
        {messages.length === 0 ? (
          <Box className="welcome-message">
            <Typography variant="h5">Willkommen beim Chat!</Typography>
            <Typography variant="body1">
              Ich bin Willi, Ihr virtueller Assistent für die Energiewirtschaft. 
              Wie kann ich Ihnen heute helfen?
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box key={message.id} className="message-with-context">
              <Message message={message} />
              {!message.isUser && message.context && (
                <ChatContextDisplay 
                  messageId={message.id} 
                  context={message.context}
                  sources={message.sources}
                  isVisible={false}
                />
              )}
              {!message.isUser && message.queryInfo && (
                <Box className="query-info">
                  {message.queryInfo.usedHyDE && (
                    <Tooltip title="HyDE wurde verwendet">
                      <Chip 
                        icon={<HydeIcon />} 
                        label="HyDE" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                  {message.queryInfo.usedFilters && (
                    <Tooltip title="Intelligente Filter wurden angewendet">
                      <Chip 
                        icon={<FilterIcon />} 
                        label="Filter" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                  {message.queryInfo.collection && (
                    <Tooltip title={message.queryInfo.collection === 'cs30' ? 
                              'CS/30 Software-Wissensbasis' : 
                              'Marktkommunikation-Wissensbasis'}>
                      <Chip 
                        label={message.queryInfo.collection === 'cs30' ? 'CS/30' : 'MaKo'} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Stellen Sie Ihre Frage..."
          value={inputValue}
          onChange={handleInputChange}
          disabled={loading}
          className="chat-input"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !inputValue.trim()}
          endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          className="send-button"
        >
          Senden
        </Button>
      </form>
    </Box>
  );
};

export default ChatFlow;
