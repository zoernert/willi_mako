/**
 * Plugin Registry Implementation
 * Verwaltet Plugins und deren Lifecycle
 */

import {
  IPlugin,
  PluginRegistry,
  PluginContext,
  PluginAPI,
  PluginConfig,
  PluginMetadata
} from './plugin.interface';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';

export class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  private activePlugins: Set<string> = new Set();
  private eventEmitter: EventEmitter = new EventEmitter();
  private context: PluginContext;
  private api: PluginAPI;

  constructor(
    private config: PluginConfig,
    context: PluginContext,
    api: PluginAPI
  ) {
    this.context = context;
    this.api = api;
  }

  async register(plugin: IPlugin): Promise<void> {
    const { name, apiVersion } = plugin.metadata;
    
    // Validate API version compatibility
    if (!this.isApiVersionCompatible(apiVersion)) {
      throw new Error(`Plugin ${name} requires API version ${apiVersion}, but current version is not compatible`);
    }

    // Check if plugin is allowed
    if (this.config.allowedPlugins && !this.config.allowedPlugins.includes(name)) {
      throw new Error(`Plugin ${name} is not in the allowed list`);
    }

    if (this.config.blockedPlugins && this.config.blockedPlugins.includes(name)) {
      throw new Error(`Plugin ${name} is blocked`);
    }

    // Check dependencies
    await this.checkDependencies(plugin.metadata);

    // Register plugin
    this.plugins.set(name, plugin);
    
    // Initialize plugin
    await plugin.initialize(this.context, this.api);
    
    console.log(`Plugin ${name} registered successfully`);
  }

  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Deactivate if active
    if (this.isActive(pluginName)) {
      await this.deactivate(pluginName);
    }

    // Remove plugin
    this.plugins.delete(pluginName);
    
    console.log(`Plugin ${pluginName} unregistered successfully`);
  }

  async activate(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (this.isActive(pluginName)) {
      return; // Already active
    }

    // Check dependencies are active
    const dependencies = this.getDependencies(pluginName);
    for (const dep of dependencies) {
      if (!this.isActive(dep)) {
        throw new Error(`Dependency ${dep} is not active for plugin ${pluginName}`);
      }
    }

    // Activate plugin
    await plugin.activate();
    this.activePlugins.add(pluginName);
    
    // Call activation hook
    if (plugin.onActivate) {
      await plugin.onActivate(this.context);
    }

    this.eventEmitter.emit('plugin-activated', { name: pluginName });
    console.log(`Plugin ${pluginName} activated successfully`);
  }

  async deactivate(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (!this.isActive(pluginName)) {
      return; // Already inactive
    }

    // Check if other plugins depend on this one
    for (const [name, otherPlugin] of this.plugins) {
      if (name !== pluginName && this.isActive(name)) {
        const deps = this.getDependencies(name);
        if (deps.includes(pluginName)) {
          throw new Error(`Cannot deactivate ${pluginName} because ${name} depends on it`);
        }
      }
    }

    // Call deactivation hook
    if (plugin.onDeactivate) {
      await plugin.onDeactivate(this.context);
    }

    // Deactivate plugin
    await plugin.deactivate();
    this.activePlugins.delete(pluginName);

    this.eventEmitter.emit('plugin-deactivated', { name: pluginName });
    console.log(`Plugin ${pluginName} deactivated successfully`);
  }

  getPlugin(name: string): IPlugin | null {
    return this.plugins.get(name) || null;
  }

  getActivePlugins(): IPlugin[] {
    return Array.from(this.activePlugins)
      .map(name => this.plugins.get(name))
      .filter(plugin => plugin !== undefined) as IPlugin[];
  }

  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  isActive(pluginName: string): boolean {
    return this.activePlugins.has(pluginName);
  }

  getDependencies(pluginName: string): string[] {
    const plugin = this.plugins.get(pluginName);
    return plugin?.metadata.dependencies || [];
  }

  async loadFromDirectory(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);
          await this.loadPlugin(pluginPath);
        }
      }
    } catch (error) {
      console.error(`Failed to load plugins from directory ${directory}:`, error);
    }
  }

  async scanPlugins(): Promise<PluginMetadata[]> {
    return Array.from(this.plugins.values()).map(plugin => plugin.metadata);
  }

  // Plugin Event System
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // Hook Execution
  async executeHook(hookName: string, ...args: any[]): Promise<void> {
    const promises = [];
    
    for (const plugin of this.getActivePlugins()) {
      const hook = (plugin as any)[hookName];
      if (typeof hook === 'function') {
        promises.push(hook.apply(plugin, [...args, this.context]));
      }
    }

    await Promise.all(promises);
  }

  // Health Check for all plugins
  async healthCheck(): Promise<{ healthy: string[]; unhealthy: { name: string; message: string }[] }> {
    const healthy: string[] = [];
    const unhealthy: { name: string; message: string }[] = [];

    for (const plugin of this.getActivePlugins()) {
      try {
        if (plugin.healthCheck) {
          const result = await plugin.healthCheck();
          if (result.status === 'healthy') {
            healthy.push(plugin.metadata.name);
          } else {
            unhealthy.push({ name: plugin.metadata.name, message: result.message || 'Unhealthy' });
          }
        } else {
          healthy.push(plugin.metadata.name);
        }
      } catch (error) {
        unhealthy.push({ 
          name: plugin.metadata.name, 
          message: error instanceof Error ? error.message : 'Health check failed' 
        });
      }
    }

    return { healthy, unhealthy };
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const indexPath = path.join(pluginPath, 'index.js');

      // Check if plugin files exist
      await fs.access(packageJsonPath);
      await fs.access(indexPath);

      // Load plugin
      const PluginClass = require(indexPath);
      const plugin = new PluginClass();

      await this.register(plugin);

      if (this.config.autoload) {
        await this.activate(plugin.metadata.name);
      }
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
    }
  }

  private isApiVersionCompatible(apiVersion: string): boolean {
    // Simple version compatibility check
    // In production, you'd want more sophisticated version comparison
    return apiVersion === '1.0.0' || apiVersion.startsWith('1.');
  }

  private async checkDependencies(metadata: PluginMetadata): Promise<void> {
    if (!metadata.dependencies) return;

    for (const dep of metadata.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency: ${dep} for plugin ${metadata.name}`);
      }
    }
  }
}
