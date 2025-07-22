/**
 * Example Plugin Implementation
 * Demonstrates how to create a plugin for the system
 */

import {
  IPlugin,
  PluginMetadata,
  PluginContext,
  PluginAPI
} from '../../core/plugins/plugin.interface';

export class ExamplePlugin implements IPlugin {
  metadata: PluginMetadata = {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'Example plugin demonstrating the plugin system capabilities',
    author: 'System',
    apiVersion: '1.0.0',
    dependencies: []
  };

  private context?: PluginContext;
  private api?: PluginAPI;
  private isInitialized = false;

  async initialize(context: PluginContext, api: PluginAPI): Promise<void> {
    this.context = context;
    this.api = api;

    // Register plugin routes
    this.api.addRoute('GET', '/example/status', this.getStatus.bind(this));
    this.api.addRoute('POST', '/example/action', this.performAction.bind(this));

    // Add dashboard widget
    this.api.addDashboardWidget({
      id: 'example-widget',
      title: 'Example Widget',
      component: 'ExampleWidget',
      position: 'sidebar'
    });

    // Add settings page
    this.api.addSettingsPage({
      id: 'example-settings',
      title: 'Example Settings',
      icon: 'settings',
      component: 'ExampleSettings'
    });

    // Add menu item
    this.api.addMenuItem({
      id: 'example-menu',
      label: 'Example Plugin',
      icon: 'extension',
      route: '/example',
      position: 'main'
    });

    // Schedule a background job
    this.api.scheduleJob('example-job', '*/5 * * * *', this.backgroundJob.bind(this));

    // Add worker
    this.api.addWorker('example-worker', this.workerHandler.bind(this));

    this.isInitialized = true;
    console.log('Example plugin initialized');
  }

  async activate(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Plugin must be initialized before activation');
    }

    console.log('Example plugin activated');
  }

  async deactivate(): Promise<void> {
    console.log('Example plugin deactivated');
  }

  // Plugin Configuration
  getDefaultConfig(): Record<string, any> {
    return {
      enableFeatureX: true,
      maxItems: 100,
      apiKey: '',
      settings: {
        theme: 'default',
        language: 'en'
      }
    };
  }

  validateConfig(config: Record<string, any>): boolean {
    // Validate required fields
    if (typeof config.enableFeatureX !== 'boolean') {
      return false;
    }

    if (typeof config.maxItems !== 'number' || config.maxItems < 1) {
      return false;
    }

    return true;
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // Perform some health checks
      if (!this.context || !this.api) {
        return { status: 'unhealthy', message: 'Plugin context not available' };
      }

      // Check database connectivity if needed
      // Check external service availability if needed

      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Lifecycle Hooks
  async onActivate(context: PluginContext): Promise<void> {
    console.log('Example plugin onActivate hook called');
    // Initialize plugin-specific resources
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    console.log('Example plugin onDeactivate hook called');
    // Cleanup plugin-specific resources
  }

  // User Hooks
  async onUserCreated(user: any, context: PluginContext): Promise<void> {
    console.log(`Example plugin: New user created - ${user.username}`);
    // Welcome email, setup default preferences, etc.
  }

  async onUserLogin(user: any, context: PluginContext): Promise<void> {
    console.log(`Example plugin: User logged in - ${user.username}`);
    // Track login analytics, check for security alerts, etc.
  }

  // Document Hooks
  async onDocumentUploaded(document: any, context: PluginContext): Promise<void> {
    console.log(`Example plugin: Document uploaded - ${document.title}`);
    // Auto-tagging, virus scanning, metadata extraction, etc.
  }

  // Quiz Hooks
  async onQuizAttemptCompleted(attempt: any, context: PluginContext): Promise<void> {
    console.log(`Example plugin: Quiz attempt completed - Score: ${attempt.score}`);
    // Achievement system, performance analytics, etc.
  }

  // HTTP Route Handlers
  private async getStatus(req: any, res: any): Promise<void> {
    try {
      const status = {
        plugin: this.metadata.name,
        version: this.metadata.version,
        active: true,
        timestamp: new Date().toISOString(),
        config: this.getDefaultConfig()
      };

      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get plugin status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async performAction(req: any, res: any): Promise<void> {
    try {
      const { action, data } = req.body;

      switch (action) {
        case 'ping':
          res.json({ message: 'pong', timestamp: new Date().toISOString() });
          break;
        
        case 'process':
          // Simulate some processing
          const result = await this.processData(data);
          res.json({ result });
          break;
        
        default:
          res.status(400).json({ error: 'Unknown action' });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to perform action',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Background Job Handler
  private async backgroundJob(): Promise<void> {
    try {
      console.log('Example plugin: Running background job');
      // Perform periodic maintenance, data cleanup, etc.
    } catch (error) {
      console.error('Example plugin background job failed:', error);
    }
  }

  // Worker Handler
  private async workerHandler(data: any): Promise<void> {
    try {
      console.log('Example plugin: Processing worker data', data);
      // Process queued tasks, handle async operations, etc.
    } catch (error) {
      console.error('Example plugin worker failed:', error);
    }
  }

  // Helper Methods
  private async processData(data: any): Promise<any> {
    // Simulate data processing
    return {
      processed: true,
      originalData: data,
      processedAt: new Date().toISOString(),
      processedBy: this.metadata.name
    };
  }
}

// Export the plugin class
module.exports = ExamplePlugin;
