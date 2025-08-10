// Community Hub Validation Schemas (Simple version without Zod)
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-09

import { PatchOperation, ThreadStatus } from '../types/community';

// Basic validation functions
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidThreadStatus = (status: string): status is ThreadStatus => {
  return ['discussing', 'review', 'final'].includes(status);
};

// String validation
export const validateString = (value: any, fieldName: string, options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
} = {}): string => {
  if (options.required && (value === undefined || value === null)) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (value === undefined || value === null) {
    return '';
  }
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  const trimmed = value.trim();
  
  if (options.required && trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (options.minLength && trimmed.length < options.minLength) {
    throw new Error(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new Error(`${fieldName} must not exceed ${options.maxLength} characters`);
  }
  
  return trimmed;
};

// Array validation
export const validateArray = (value: any, fieldName: string, options: {
  required?: boolean;
  maxLength?: number;
  itemValidator?: (item: any) => void;
} = {}): any[] => {
  if (options.required && (value === undefined || value === null)) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (value === undefined || value === null) {
    return [];
  }
  
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must not exceed ${options.maxLength} items`);
  }
  
  if (options.itemValidator) {
    value.forEach((item, index) => {
      try {
        options.itemValidator!(item);
      } catch (error) {
        throw new Error(`${fieldName}[${index}]: ${error.message}`);
      }
    });
  }
  
  return value;
};

// Patch operation validation
export const validatePatchOperation = (op: any): PatchOperation => {
  if (!op || typeof op !== 'object') {
    throw new Error('Patch operation must be an object');
  }
  
  const validOps = ['replace', 'add', 'upsertProposal'];
  if (!validOps.includes(op.op)) {
    throw new Error(`Invalid operation: ${op.op}. Must be one of: ${validOps.join(', ')}`);
  }
  
  if (op.op === 'replace') {
    const validPaths = ['/problem_description', '/context', '/analysis', '/final_solution'];
    if (!op.path || !validPaths.includes(op.path)) {
      throw new Error(`Invalid path for replace operation: ${op.path}`);
    }
  }
  
  if (op.op === 'upsertProposal' && !op.proposalId) {
    throw new Error('upsertProposal operation requires proposalId');
  }
  
  if (op.value === undefined || op.value === null) {
    throw new Error('Patch operation must have a value');
  }
  
  return op as PatchOperation;
};

// Create thread validation
export const validateCreateThreadRequest = (data: any) => {
  const errors: string[] = [];
  
  try {
    validateString(data.title, 'title', { required: true, minLength: 5, maxLength: 255 });
  } catch (error) {
    errors.push(error.message);
  }
  
  if (data.tags) {
    try {
      validateArray(data.tags, 'tags', { 
        maxLength: 10,
        itemValidator: (tag) => validateString(tag, 'tag', { maxLength: 50 })
      });
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
};

// Update document validation
export const validateUpdateDocumentRequest = (data: any) => {
  const errors: string[] = [];
  
  // Handle both direct array format and object with operations property
  let operations;
  if (Array.isArray(data)) {
    operations = data;
  } else if (data.operations) {
    operations = data.operations;
  } else {
    errors.push('operations is required (either as direct array or object with operations property)');
  }
  
  if (operations) {
    try {
      validateArray(operations, 'operations', { 
        required: true,
        maxLength: 10,
        itemValidator: validatePatchOperation
      });
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  
  return operations;
};

// Comment validation
export const validateCreateCommentRequest = (data: any) => {
  const errors: string[] = [];
  
  try {
    validateString(data.blockId, 'blockId', { required: true, maxLength: 255 });
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateString(data.content, 'content', { required: true, maxLength: 2000 });
  } catch (error) {
    errors.push(error.message);
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
};

// Status validation
export const validateStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    'discussing': ['review', 'final'],
    'review': ['discussing', 'final'],
    'final': [] // No transitions from final (admin override required)
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Environment variable validation
export const validateCommunityEnv = () => {
  return {
    QDRANT_COMMUNITY_COLLECTION: process.env.QDRANT_COMMUNITY_COLLECTION || 'community_content',
    COMMUNITY_MAX_PROPOSALS: parseInt(process.env.COMMUNITY_MAX_PROPOSALS || '50', 10),
    COMMUNITY_ENABLE_PUBLIC_READ: process.env.COMMUNITY_ENABLE_PUBLIC_READ === 'true',
    FEATURE_COMMUNITY_HUB: process.env.FEATURE_COMMUNITY_HUB === 'true',
    FEATURE_COMMUNITY_ESCALATION: process.env.FEATURE_COMMUNITY_ESCALATION === 'true'
  };
};

// Rate limiting configuration
export const RATE_LIMITS = {
  PATCH_OPS_PER_5MIN: 30,
  COMMENTS_PER_5MIN: 10,
  THREADS_PER_HOUR: 5
} as const;
