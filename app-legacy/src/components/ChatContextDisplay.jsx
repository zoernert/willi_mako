import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  Button, 
  Chip, 
  Tab, 
  Tabs,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess,
  InfoOutlined,
  StarOutline,
  StarRate,
  HistoryEdu,
  Description,
  ListAlt,
  TableChart,
  Help,
  Source as SourceIcon
} from '@mui/icons-material';
import { fetchChatResponse, updateContextQuality } from '../actions/chatActions';
import './ChatContextDisplay.css';

/**
 * Enhanced chat context display component that shows the context used
 * for generating answers and allows user feedback on context relevance
 */
const ChatContextDisplay = ({ messageId, context, sources = [], isVisible = false, searchMetrics = {} }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(isVisible);
  const [activeTab, setActiveTab] = useState(0);
  const [contextFeedback, setContextFeedback] = useState({
    helpful: null,
    feedbackSent: false
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [tabType, setTabType] = useState('documents'); // 'documents' oder 'sources'
  
  // Toggle expanded state
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle document type tab selection
  const handleTabTypeChange = (event, newValue) => {
    setTabType(newValue);
    setActiveTab(0); // Reset active tab when switching between documents and sources
  };
  
  // Handle item selection for feedback
  const handleItemSelect = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };
  
  // Parse and organize context for better display
  const parsedContext = React.useMemo(() => {
    if (!context) return [];
    
    const contextItems = Array.isArray(context) ? context : [context];
    
    // Sort by relevance score (highest first)
    const sortedItems = [...contextItems].sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    });
    
    return sortedItems.map((item, index) => {
      // Extract document metadata if available
      const title = item.payload?.title || item.title || item.payload?.name || item.name || `Dokument ${index + 1}`;
      const source = item.payload?.source || item.source || 'Unbekannte Quelle';
      const relevance = item.score ? `${(item.score * 100).toFixed(1)}%` : 'Unbekannt';
      const content = item.payload?.content || item.content || item.payload?.text || item.text || '';
      const date = item.payload?.date || item.date || item.payload?.updated_at || '';
      
      // Categorize document type
      const type = determineDocumentType(item);
      
      // Extract document keywords
      const keywords = item.keywords || item.tags || [];
      
      return {
        id: index,
        title,
        source,
        relevance,
        content,
        type,
        date,
        keywords,
        raw: item
      };
    });
  }, [context]);
  
  // Group context by document type
  const groupedContext = React.useMemo(() => {
    const grouped = {};
    
    parsedContext.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });
    
    return grouped;
  }, [parsedContext]);
  
  // Get document types for tabs
  const documentTypes = React.useMemo(() => {
    return Object.keys(groupedContext).sort();
  }, [groupedContext]);
  
  // Determine document type based on metadata
  const determineDocumentType = (doc) => {
    // Check payload first
    if (doc.payload) {
      if (doc.payload.chunk_type) return doc.payload.chunk_type;
      if (doc.payload.type) return doc.payload.type;
    }
    
    // Then check direct properties
    if (doc.type) return doc.type;
    if (doc.chunk_type) return doc.chunk_type;
    
    // Infer from content
    const content = doc.payload?.content || doc.content || doc.payload?.text || doc.text || '';
    const title = doc.payload?.title || doc.title || doc.payload?.name || doc.name || '';
    
    if (title.match(/^(Definition|Bedeutung|Was ist)/i) || 
        content.match(/^(Definition|Bedeutung):/i) ||
        content.match(/bezeichnet|bedeutet|steht für/i)) {
      return 'Definition';
    }
    
    if (content.includes('|----') || 
        content.match(/\|\s*[^\|]+\s*\|/) ||
        title.match(/Tabelle|Liste|Übersicht|Aufstellung/i)) {
      return 'Tabelle';
    }
    
    if (title.match(/Prozess|Vorgehen|Ablauf|Schritte/i) ||
        content.match(/Schritt \d|Prozessablauf|Im ersten Schritt/i)) {
      return 'Prozess';
    }
    
    if (title.match(/GPKE/) || content.match(/GPKE/)) {
      return 'GPKE';
    }
    
    if (title.match(/MaBiS/) || content.match(/MaBiS/)) {
      return 'MaBiS';
    }
    
    return 'Allgemein';
  };
  
  // Get icon for document type
  const getTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'definition':
        return <InfoOutlined />;
      case 'tabelle':
      case 'table':
        return <TableChart />;
      case 'prozess':
      case 'process':
        return <ListAlt />;
      case 'gpke':
      case 'mabis':
      case 'wim':
        return <Description />;
      case 'fehler':
      case 'error':
        return <Help />;
      default:
        return <HistoryEdu />;
    }
  };
  
  // Handle feedback submission
  const handleFeedback = (isHelpful) => {
    setContextFeedback({
      helpful: isHelpful,
      feedbackSent: true
    });
    
    dispatch(updateContextQuality({
      messageId,
      isHelpful,
      selectedItems,
      context: parsedContext.map(item => ({
        id: item.id,
        title: item.title,
        source: item.source,
        relevance: item.relevance,
        type: item.type,
        wasHelpful: isHelpful,
        isSelected: selectedItems.includes(item.id)
      }))
    }));
  };
  
  // Render metrics from search
  const renderMetrics = () => {
    if (!searchMetrics || Object.keys(searchMetrics).length === 0) return null;
    
    return (
      <Box className="search-metrics">
        <Typography variant="caption" color="textSecondary">
          Suchdauer: {searchMetrics.totalTime || searchMetrics.totalProcessingTime || 0}ms | 
          Gefundene Dokumente: {searchMetrics.resultCount || 0} | 
          Sammlung: {searchMetrics.collectionUsed || 'cs30'}
        </Typography>
      </Box>
    );
  };
  
  // Render sources list
  const renderSources = () => {
    if (!sources || sources.length === 0) return (
      <Box p={2}>
        <Typography variant="body2" color="textSecondary">
          Keine Quellenangaben verfügbar.
        </Typography>
      </Box>
    );
    
    return (
      <List dense>
        {sources.map((source, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <SourceIcon />
            </ListItemIcon>
            <ListItemText 
              primary={source.title || "Unbekannter Titel"} 
              secondary={
                <React.Fragment>
                  {source.source || "Unbekannte Quelle"}
                  {source.date && ` (Stand: ${source.date})`}
                  {source.score && ` | Relevanz: ${(source.score * 100).toFixed(1)}%`}
                </React.Fragment>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };
  
  if (!context || parsedContext.length === 0) {
    return null;
  }
  
  return (
    <Box className="chat-context-container">
      <Button 
        variant="text" 
        size="small"
        onClick={toggleExpand}
        className="context-toggle-button"
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
      >
        <Badge badgeContent={parsedContext.length} color="primary">
          Verwendeter Kontext
        </Badge>
      </Button>
      
      {expanded && (
        <Paper className="context-paper" elevation={1}>
          {/* Context metrics */}
          {renderMetrics()}
          
          {/* Feedback section */}
          {!contextFeedback.feedbackSent ? (
            <Box className="context-feedback">
              <Typography variant="body2" gutterBottom>
                War dieser Kontext hilfreich für die Antwort?
              </Typography>
              <Box className="feedback-buttons">
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small" 
                  onClick={() => handleFeedback(true)}
                  startIcon={<StarRate />}
                >
                  Ja, hilfreich
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small" 
                  onClick={() => handleFeedback(false)}
                  startIcon={<StarOutline />}
                >
                  Nein, unpassend
                </Button>
              </Box>
            </Box>
          ) : (
            <Box className="context-feedback">
              <Typography variant="body2" color="textSecondary">
                Vielen Dank für Ihr Feedback!
              </Typography>
            </Box>
          )}
          
          <Divider className="context-divider" />
          
          {/* Tab type selector (Dokumente / Quellen) */}
          <Tabs
            value={tabType}
            onChange={handleTabTypeChange}
            variant="fullWidth"
            className="tab-type-selector"
          >
            <Tab label="Dokumente" value="documents" />
            <Tab label="Quellen" value="sources" />
          </Tabs>
          
          <Divider className="context-divider" />
          
          {tabType === "documents" ? (
            <>
              {/* Tabs for document types */}
              {documentTypes.length > 1 && (
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  className="context-tabs"
                >
                  <Tab label="Alle" value={0} />
                  {documentTypes.map((type, index) => (
                    <Tab 
                      key={type} 
                      label={
                        <Badge 
                          badgeContent={groupedContext[type].length} 
                          color="primary"
                          className="tab-badge"
                        >
                          {type}
                        </Badge>
                      } 
                      value={index + 1} 
                      icon={getTypeIcon(type)}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
              )}
              
              <Box className="context-items-container">
                {activeTab === 0 ? (
                  parsedContext.map(item => (
                    <Paper 
                      key={item.id} 
                      className={`context-item ${selectedItems.includes(item.id) ? 'context-item-selected' : ''}`}
                      onClick={() => handleItemSelect(item.id)}
                      elevation={1}
                    >
                      <Box className="context-item-header">
                        <Typography className="context-item-title" variant="subtitle1">
                          {item.title}
                        </Typography>
                        <Box className="context-item-meta">
                          <Chip 
                            size="small" 
                            label={item.type} 
                            icon={getTypeIcon(item.type)}
                            className="context-type-chip"
                          />
                          <Tooltip title="Relevanz zur Anfrage">
                            <Chip 
                              size="small" 
                              label={item.relevance} 
                              className="context-relevance-chip"
                              color={
                                parseFloat(item.relevance) > 80 ? "success" : 
                                parseFloat(item.relevance) > 60 ? "primary" : 
                                parseFloat(item.relevance) > 40 ? "default" : "error"
                              }
                            />
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography variant="body2" className="context-item-content">
                        {item.content}
                      </Typography>
                      <Box className="context-item-footer">
                        <Typography variant="caption" color="textSecondary">
                          Quelle: {item.source}
                          {item.date && ` (Stand: ${item.date})`}
                        </Typography>
                        <Box className="context-item-tags">
                          {Array.isArray(item.keywords) && item.keywords.slice(0, 3).map((keyword, idx) => (
                            <Chip 
                              key={idx} 
                              label={keyword} 
                              size="small" 
                              variant="outlined"
                              className="keyword-chip"
                            />
                          ))}
                        </Box>
                      </Box>
                    </Paper>
                  ))
                ) : (
                  groupedContext[documentTypes[activeTab - 1]]?.map(item => (
                    <Paper 
                      key={item.id} 
                      className={`context-item ${selectedItems.includes(item.id) ? 'context-item-selected' : ''}`}
                      onClick={() => handleItemSelect(item.id)}
                      elevation={1}
                    >
                      <Box className="context-item-header">
                        <Typography className="context-item-title" variant="subtitle1">
                          {item.title}
                        </Typography>
                        <Box className="context-item-meta">
                          <Tooltip title="Relevanz zur Anfrage">
                            <Chip 
                              size="small" 
                              label={item.relevance} 
                              className="context-relevance-chip"
                              color={
                                parseFloat(item.relevance) > 80 ? "success" : 
                                parseFloat(item.relevance) > 60 ? "primary" : 
                                parseFloat(item.relevance) > 40 ? "default" : "error"
                              }
                            />
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography variant="body2" className="context-item-content">
                        {item.content}
                      </Typography>
                      <Box className="context-item-footer">
                        <Typography variant="caption" color="textSecondary">
                          Quelle: {item.source}
                          {item.date && ` (Stand: ${item.date})`}
                        </Typography>
                        <Box className="context-item-tags">
                          {Array.isArray(item.keywords) && item.keywords.slice(0, 3).map((keyword, idx) => (
                            <Chip 
                              key={idx} 
                              label={keyword} 
                              size="small" 
                              variant="outlined"
                              className="keyword-chip"
                            />
                          ))}
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </>
          ) : (
            // Quellen-Tab
            <Box className="sources-container">
              {renderSources()}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ChatContextDisplay;
