"use strict";
/**
 * Plugin API Implementation
 * Bietet Plugins Zugriff auf System-Funktionalitäten
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginAPIImpl = void 0;
class PluginAPIImpl {
    constructor(router) {
        this.widgets = [];
        this.settingsPages = [];
        this.menuItems = [];
        this.migrations = [];
        this.jobs = new Map();
        this.workers = new Map();
        this.router = router;
    }
    addRoute(method, path, handler) {
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
    addMiddleware(middleware) {
        this.router.use('/api/plugins', middleware);
        console.log('Plugin middleware registered');
    }
    addMigration(migration) {
        this.migrations.push(migration);
        console.log('Plugin migration registered');
    }
    addDashboardWidget(widget) {
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
    addSettingsPage(page) {
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
    addMenuItem(item) {
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
    scheduleJob(name, schedule, handler) {
        if (this.jobs.has(name)) {
            throw new Error(`Job with name ${name} already exists`);
        }
        this.jobs.set(name, { schedule, handler });
        console.log(`Background job scheduled: ${name} (${schedule})`);
    }
    addWorker(name, handler) {
        if (this.workers.has(name)) {
            throw new Error(`Worker with name ${name} already exists`);
        }
        this.workers.set(name, handler);
        console.log(`Worker registered: ${name}`);
    }
    // Getters for registered components
    getWidgets() {
        return [...this.widgets];
    }
    getSettingsPages() {
        return [...this.settingsPages];
    }
    getMenuItems() {
        return [...this.menuItems];
    }
    getMigrations() {
        return [...this.migrations];
    }
    getJobs() {
        return new Map(this.jobs);
    }
    getWorkers() {
        return new Map(this.workers);
    }
    // Cleanup methods for when plugins are deactivated
    removeWidget(widgetId) {
        this.widgets = this.widgets.filter(w => w.id !== widgetId);
    }
    removeSettingsPage(pageId) {
        this.settingsPages = this.settingsPages.filter(p => p.id !== pageId);
    }
    removeMenuItem(itemId) {
        this.menuItems = this.menuItems.filter(m => m.id !== itemId);
    }
    removeJob(name) {
        this.jobs.delete(name);
    }
    removeWorker(name) {
        this.workers.delete(name);
    }
    // Clear all registrations (useful for plugin deactivation)
    clearAll() {
        this.widgets = [];
        this.settingsPages = [];
        this.menuItems = [];
        this.migrations = [];
        this.jobs.clear();
        this.workers.clear();
    }
}
exports.PluginAPIImpl = PluginAPIImpl;
//# sourceMappingURL=plugin-api.js.map