"use strict";
/**
 * Plugin Registry Implementation
 * Verwaltet Plugins und deren Lifecycle
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRegistryImpl = void 0;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class PluginRegistryImpl {
    constructor(config, context, api) {
        this.config = config;
        this.plugins = new Map();
        this.activePlugins = new Set();
        this.eventEmitter = new events_1.EventEmitter();
        this.context = context;
        this.api = api;
    }
    async register(plugin) {
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
    async unregister(pluginName) {
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
    async activate(pluginName) {
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
    async deactivate(pluginName) {
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
    getPlugin(name) {
        return this.plugins.get(name) || null;
    }
    getActivePlugins() {
        return Array.from(this.activePlugins)
            .map(name => this.plugins.get(name))
            .filter(plugin => plugin !== undefined);
    }
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }
    isActive(pluginName) {
        return this.activePlugins.has(pluginName);
    }
    getDependencies(pluginName) {
        const plugin = this.plugins.get(pluginName);
        return (plugin === null || plugin === void 0 ? void 0 : plugin.metadata.dependencies) || [];
    }
    async loadFromDirectory(directory) {
        try {
            const entries = await promises_1.default.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginPath = path_1.default.join(directory, entry.name);
                    await this.loadPlugin(pluginPath);
                }
            }
        }
        catch (error) {
            console.error(`Failed to load plugins from directory ${directory}:`, error);
        }
    }
    async scanPlugins() {
        return Array.from(this.plugins.values()).map(plugin => plugin.metadata);
    }
    // Plugin Event System
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
    emit(event, ...args) {
        this.eventEmitter.emit(event, ...args);
    }
    // Hook Execution
    async executeHook(hookName, ...args) {
        const promises = [];
        for (const plugin of this.getActivePlugins()) {
            const hook = plugin[hookName];
            if (typeof hook === 'function') {
                promises.push(hook.apply(plugin, [...args, this.context]));
            }
        }
        await Promise.all(promises);
    }
    // Health Check for all plugins
    async healthCheck() {
        const healthy = [];
        const unhealthy = [];
        for (const plugin of this.getActivePlugins()) {
            try {
                if (plugin.healthCheck) {
                    const result = await plugin.healthCheck();
                    if (result.status === 'healthy') {
                        healthy.push(plugin.metadata.name);
                    }
                    else {
                        unhealthy.push({ name: plugin.metadata.name, message: result.message || 'Unhealthy' });
                    }
                }
                else {
                    healthy.push(plugin.metadata.name);
                }
            }
            catch (error) {
                unhealthy.push({
                    name: plugin.metadata.name,
                    message: error instanceof Error ? error.message : 'Health check failed'
                });
            }
        }
        return { healthy, unhealthy };
    }
    async loadPlugin(pluginPath) {
        try {
            const packageJsonPath = path_1.default.join(pluginPath, 'package.json');
            const indexPath = path_1.default.join(pluginPath, 'index.js');
            // Check if plugin files exist
            await promises_1.default.access(packageJsonPath);
            await promises_1.default.access(indexPath);
            // Load plugin
            const PluginClass = require(indexPath);
            const plugin = new PluginClass();
            await this.register(plugin);
            if (this.config.autoload) {
                await this.activate(plugin.metadata.name);
            }
        }
        catch (error) {
            console.error(`Failed to load plugin from ${pluginPath}:`, error);
        }
    }
    isApiVersionCompatible(apiVersion) {
        // Simple version compatibility check
        // In production, you'd want more sophisticated version comparison
        return apiVersion === '1.0.0' || apiVersion.startsWith('1.');
    }
    async checkDependencies(metadata) {
        if (!metadata.dependencies)
            return;
        for (const dep of metadata.dependencies) {
            if (!this.plugins.has(dep)) {
                throw new Error(`Missing dependency: ${dep} for plugin ${metadata.name}`);
            }
        }
    }
}
exports.PluginRegistryImpl = PluginRegistryImpl;
//# sourceMappingURL=plugin-registry.js.map