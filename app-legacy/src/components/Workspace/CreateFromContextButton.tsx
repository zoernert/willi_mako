import React from 'react';
import { Button, Chip, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface ChatContext {
  chatId: string;
  messageId: string;
  content: string;
  timestamp: string;
  role: string;
  metadata?: any;
}

interface CreateFromContextButtonProps {
  variant?: 'button' | 'chip';
  size?: 'small' | 'medium' | 'large';
  context: {
    source: string;
    chatContext: ChatContext;
  };
}

const CreateFromContextButton: React.FC<CreateFromContextButtonProps> = ({
  variant = 'button',
  size = 'medium',
  context
}) => {
  const handleClick = () => {
    // TODO: Implement context-based creation functionality
    console.log('Creating from context:', context);
  };

  if (variant === 'chip') {
    return (
      <Tooltip title="Bilaterale Klärung aus diesem Kontext erstellen">
        <Chip
          icon={<AddIcon />}
          label="Klärung erstellen"
          size={size as 'small' | 'medium'}
          onClick={handleClick}
          clickable
          sx={{ ml: 1 }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Aus diesem Kontext erstellen">
      <Button
        startIcon={<AddIcon />}
        onClick={handleClick}
        size={size}
        variant="outlined"
      >
        Aus Kontext erstellen
      </Button>
    </Tooltip>
  );
};

export default CreateFromContextButton;
