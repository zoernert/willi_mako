/**
 * Plugin System Core Interfaces
 * Definiert das grundlegende Plugin-System für einfache Feature-Erweiterungen
 */
import { Request, Response, NextFunction } from 'express';
export interface PluginMetadata {
    name: string;
    version: string;
    description: string;
    author?: string;
    dependencies?: string[];
    apiVersion: string;
}
export interface PluginContext {
    userService?: any;
    workspaceService?: any;
    quizService?: any;
    documentsService?: any;
    database: any;
    logger: any;
    config: any;
    emit(event: string, data: any): void;
    on(event: string, handler: (data: any) => void): void;
    off(event: string, handler: (data: any) => void): void;
}
export interface PluginHooks {
    onActivate?(context: PluginContext): Promise<void>;
    onDeactivate?(context: PluginContext): Promise<void>;
    onUserCreated?(user: any, context: PluginContext): Promise<void>;
    onUserUpdated?(user: any, context: PluginContext): Promise<void>;
    onUserDeleted?(userId: string, context: PluginContext): Promise<void>;
    onUserLogin?(user: any, context: PluginContext): Promise<void>;
    onUserLogout?(userId: string, context: PluginContext): Promise<void>;
    onDocumentUploaded?(document: any, context: PluginContext): Promise<void>;
    onDocumentProcessed?(document: any, context: PluginContext): Promise<void>;
    onDocumentDeleted?(documentId: string, context: PluginContext): Promise<void>;
    onQuizCreated?(quiz: any, context: PluginContext): Promise<void>;
    onQuizAttemptStarted?(attempt: any, context: PluginContext): Promise<void>;
    onQuizAttemptCompleted?(attempt: any, context: PluginContext): Promise<void>;
    onChatSessionCreated?(session: any, context: PluginContext): Promise<void>;
    onChatMessageSent?(message: any, context: PluginContext): Promise<void>;
    onFAQCreated?(faq: any, context: PluginContext): Promise<void>;
    onFAQViewed?(faq: any, context: PluginContext): Promise<void>;
}
export interface PluginAPI {
    addRoute(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, handler: (req: Request, res: Response, next: NextFunction) => void): void;
    addMiddleware(middleware: (req: Request, res: Response, next: NextFunction) => void): void;
    addMigration(migration: string): void;
    addDashboardWidget(widget: PluginWidget): void;
    addSettingsPage(page: PluginSettingsPage): void;
    addMenuItem(item: PluginMenuItem): void;
    scheduleJob(name: string, schedule: string, handler: () => Promise<void>): void;
    addWorker(name: string, handler: (data: any) => Promise<void>): void;
}
export interface PluginWidget {
    id: string;
    title: string;
    component: string;
    position: 'top' | 'sidebar' | 'bottom';
    permissions?: string[];
}
export interface PluginSettingsPage {
    id: string;
    title: string;
    icon?: string;
    component: string;
    permissions?: string[];
}
export interface PluginMenuItem {
    id: string;
    label: string;
    icon?: string;
    route: string;
    position: 'main' | 'admin' | 'user';
    permissions?: string[];
}
export interface IPlugin extends PluginHooks {
    metadata: PluginMetadata;
    initialize(context: PluginContext, api: PluginAPI): Promise<void>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    getDefaultConfig?(): Record<string, any>;
    validateConfig?(config: Record<string, any>): boolean;
    healthCheck?(): Promise<{
        status: 'healthy' | 'unhealthy';
        message?: string;
    }>;
}
export interface PluginRegistry {
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
}
export interface PluginConfig {
    enabled: boolean;
    autoload: boolean;
    directory: string;
    maxPlugins: number;
    allowedPlugins?: string[];
    blockedPlugins?: string[];
}
//# sourceMappingURL=plugin.interface.d.ts.map