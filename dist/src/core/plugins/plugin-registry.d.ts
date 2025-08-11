/**
 * Plugin Registry Implementation
 * Verwaltet Plugins und deren Lifecycle
 */
import { IPlugin, PluginRegistry, PluginContext, PluginAPI, PluginConfig, PluginMetadata } from './plugin.interface';
export declare class PluginRegistryImpl implements PluginRegistry {
    private config;
    private plugins;
    private activePlugins;
    private eventEmitter;
    private context;
    private api;
    constructor(config: PluginConfig, context: PluginContext, api: PluginAPI);
    register(plugin: IPlugin): Promise<void>;
    unregister(pluginName: string): Promise<void>;
    activate(pluginName: string): Promise<void>;
    deactivate(pluginName: string): Promise<void>;
    getPlugin(name: string): IPlugin | null;
    getActivePlugins(): IPlugin[];
    getAllPlugins(): IPlugin[];
    isActive(pluginName: string): boolean;
    getDependencies(pluginName: string): string[];
    loadFromDirectory(directory: string): Promise<void>;
    scanPlugins(): Promise<PluginMetadata[]>;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    executeHook(hookName: string, ...args: any[]): Promise<void>;
    healthCheck(): Promise<{
        healthy: string[];
        unhealthy: {
            name: string;
            message: string;
        }[];
    }>;
    private loadPlugin;
    private isApiVersionCompatible;
    private checkDependencies;
}
//# sourceMappingURL=plugin-registry.d.ts.map