/**
 * Plugin API Implementation
 * Bietet Plugins Zugriff auf System-Funktionalitäten
 */

import { Request, Response, NextFunction, Router } from 'express';
import {
  PluginAPI,
  PluginWidget,
  PluginSettingsPage,
  PluginMenuItem
} from './plugin.interface';

export class PluginAPIImpl implements PluginAPI {
  private router: Router;
  private widgets: PluginWidget[] = [];
  private settingsPages: PluginSettingsPage[] = [];
  private menuItems: PluginMenuItem[] = [];
  private migrations: string[] = [];
  private jobs: Map<string, { schedule: string; handler: () => Promise<void> }> = new Map();
  private workers: Map<string, (data: any) => Promise<void>> = new Map();

  constructor(router: Router) {
    this.router = router;
  }

  addRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    handler: (req: Request, res: Response, next: NextFunction) => void
  ): void {
    // Ensure plugin routes are prefixed
    const pluginPath = `/api/plugins${path}`;
    
    switch (method) {
      case 'GET':
        this.router.get(pluginPath, handler);
        break;
      case 'POST':
        this.router.post(pluginPath, handler);
        break;
      case 'PUT':
        this.router.put(pluginPath, handler);
        break;
      case 'DELETE':
        this.router.delete(pluginPath, handler);
        break;
    }

    console.log(`Plugin route registered: ${method} ${pluginPath}`);
  }

  addMiddleware(middleware: (req: Request, res: Response, next: NextFunction) => void): void {
    this.router.use('/api/plugins', middleware);
    console.log('Plugin middleware registered');
  }

  addMigration(migration: string): void {
    this.migrations.push(migration);
    console.log('Plugin migration registered');
  }

  addDashboardWidget(widget: PluginWidget): void {
    // Validate widget
    if (!widget.id || !widget.title || !widget.component) {
      throw new Error('Widget must have id, title, and component');
    }

    // Check for duplicate widget IDs
    if (this.widgets.some(w => w.id === widget.id)) {
      throw new Error(`Widget with id ${widget.id} already exists`);
    }

    this.widgets.push(widget);
    console.log(`Dashboard widget registered: ${widget.id}`);
  }

  addSettingsPage(page: PluginSettingsPage): void {
    // Validate settings page
    if (!page.id || !page.title || !page.component) {
      throw new Error('Settings page must have id, title, and component');
    }

    // Check for duplicate page IDs
    if (this.settingsPages.some(p => p.id === page.id)) {
      throw new Error(`Settings page with id ${page.id} already exists`);
    }

    this.settingsPages.push(page);
    console.log(`Settings page registered: ${page.id}`);
  }

  addMenuItem(item: PluginMenuItem): void {
    // Validate menu item
    if (!item.id || !item.label || !item.route) {
      throw new Error('Menu item must have id, label, and route');
    }

    // Check for duplicate menu item IDs
    if (this.menuItems.some(m => m.id === item.id)) {
      throw new Error(`Menu item with id ${item.id} already exists`);
    }

    this.menuItems.push(item);
    console.log(`Menu item registered: ${item.id}`);
  }

  scheduleJob(name: string, schedule: string, handler: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      throw new Error(`Job with name ${name} already exists`);
    }

    this.jobs.set(name, { schedule, handler });
    console.log(`Background job scheduled: ${name} (${schedule})`);
  }

  addWorker(name: string, handler: (data: any) => Promise<void>): void {
    if (this.workers.has(name)) {
      throw new Error(`Worker with name ${name} already exists`);
    }

    this.workers.set(name, handler);
    console.log(`Worker registered: ${name}`);
  }

  // Getters for registered components
  getWidgets(): PluginWidget[] {
    return [...this.widgets];
  }

  getSettingsPages(): PluginSettingsPage[] {
    return [...this.settingsPages];
  }

  getMenuItems(): PluginMenuItem[] {
    return [...this.menuItems];
  }

  getMigrations(): string[] {
    return [...this.migrations];
  }

  getJobs(): Map<string, { schedule: string; handler: () => Promise<void> }> {
    return new Map(this.jobs);
  }

  getWorkers(): Map<string, (data: any) => Promise<void>> {
    return new Map(this.workers);
  }

  // Cleanup methods for when plugins are deactivated
  removeWidget(widgetId: string): void {
    this.widgets = this.widgets.filter(w => w.id !== widgetId);
  }

  removeSettingsPage(pageId: string): void {
    this.settingsPages = this.settingsPages.filter(p => p.id !== pageId);
  }

  removeMenuItem(itemId: string): void {
    this.menuItems = this.menuItems.filter(m => m.id !== itemId);
  }

  removeJob(name: string): void {
    this.jobs.delete(name);
  }

  removeWorker(name: string): void {
    this.workers.delete(name);
  }

  // Clear all registrations (useful for plugin deactivation)
  clearAll(): void {
    this.widgets = [];
    this.settingsPages = [];
    this.menuItems = [];
    this.migrations = [];
    this.jobs.clear();
    this.workers.clear();
  }
}
