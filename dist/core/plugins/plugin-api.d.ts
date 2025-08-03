import { Request, Response, NextFunction, Router } from 'express';
import { PluginAPI, PluginWidget, PluginSettingsPage, PluginMenuItem } from './plugin.interface';
export declare class PluginAPIImpl implements PluginAPI {
    private router;
    private widgets;
    private settingsPages;
    private menuItems;
    private migrations;
    private jobs;
    private workers;
    constructor(router: Router);
    addRoute(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, handler: (req: Request, res: Response, next: NextFunction) => void): void;
    addMiddleware(middleware: (req: Request, res: Response, next: NextFunction) => void): void;
    addMigration(migration: string): void;
    addDashboardWidget(widget: PluginWidget): void;
    addSettingsPage(page: PluginSettingsPage): void;
    addMenuItem(item: PluginMenuItem): void;
    scheduleJob(name: string, schedule: string, handler: () => Promise<void>): void;
    addWorker(name: string, handler: (data: any) => Promise<void>): void;
    getWidgets(): PluginWidget[];
    getSettingsPages(): PluginSettingsPage[];
    getMenuItems(): PluginMenuItem[];
    getMigrations(): string[];
    getJobs(): Map<string, {
        schedule: string;
        handler: () => Promise<void>;
    }>;
    getWorkers(): Map<string, (data: any) => Promise<void>>;
    removeWidget(widgetId: string): void;
    removeSettingsPage(pageId: string): void;
    removeMenuItem(itemId: string): void;
    removeJob(name: string): void;
    removeWorker(name: string): void;
    clearAll(): void;
}
//# sourceMappingURL=plugin-api.d.ts.map