import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { IAuthRequest } from '../types';
import { logger } from '../utils/logger';

export const authenticateApiKey = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // Find and validate API key
    const keyDoc = await ApiKey.findByKey(apiKey);
    
    if (!keyDoc) {
      throw new AuthenticationError('Invalid API key');
    }

    if (!keyDoc.isActive) {
      throw new AuthenticationError('API key is inactive');
    }

    // Update last used timestamp
    await keyDoc.updateLastUsed();

    // Add user context to request
    req.user = {
      orgId: keyDoc.orgId,
      projectId: keyDoc.projectId,
      apiKey: keyDoc.key,
    };

    // Log successful authentication
    logger.info('API key authenticated successfully', {
      orgId: keyDoc.orgId,
      projectId: keyDoc.projectId,
      keyName: keyDoc.name,
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      apiKey: req.headers['x-api-key'] ? 'present' : 'missing',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
};

export const requirePermission = (permission: string) => {
  return async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new AuthenticationError('API key is required');
      }

      const keyDoc = await ApiKey.findByKey(apiKey);
      
      if (!keyDoc) {
        throw new AuthenticationError('Invalid API key');
      }

      if (!keyDoc.hasPermission(permission)) {
        throw new AuthorizationError(`Permission '${permission}' required`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireOrgAccess = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.orgId) {
      throw new AuthenticationError('Organization access required');
    }

    // Add orgId to request body if not present
    if (req.body && !req.body.orgId) {
      req.body.orgId = req.user.orgId;
    }

    // Add orgId to query params if not present
    if (req.query && !req.query.orgId) {
      req.query.orgId = req.user.orgId;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireProjectAccess = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.projectId) {
      throw new AuthenticationError('Project access required');
    }

    // Add projectId to request body if not present
    if (req.body && !req.body.projectId) {
      req.body.projectId = req.user.projectId;
    }

    // Add projectId to query params if not present
    if (req.query && !req.query.projectId) {
      req.query.projectId = req.user.projectId;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const validateOrgAndProject = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orgId, projectId } = req.user || {};
    
    if (!orgId) {
      throw new AuthenticationError('Organization ID required');
    }

    if (!projectId) {
      throw new AuthenticationError('Project ID required');
    }

    // Validate that the API key has access to the requested org/project
    const apiKey = req.headers['x-api-key'] as string;
    const keyDoc = await ApiKey.findByKey(apiKey);
    
    if (!keyDoc || keyDoc.orgId !== orgId || keyDoc.projectId !== projectId) {
      throw new AuthorizationError('Access denied to this organization/project');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to extract user context from URL parameters
export const extractUserContext = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orgId, projectId } = req.params;
    
    if (orgId && (!req.user?.orgId || req.user.orgId !== orgId)) {
      throw new AuthorizationError('Access denied to this organization');
    }

    if (projectId && (!req.user?.projectId || req.user.projectId !== projectId)) {
      throw new AuthorizationError('Access denied to this project');
    }

    next();
  } catch (error) {
    next(error);
  }
}; 