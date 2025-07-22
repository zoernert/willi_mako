declare module 'edifact' {
  import { EventEmitter } from 'events';

  export class Parser extends EventEmitter {
    constructor();
    parseStringSync(content: string): any;
    write(data: string): boolean;
    end(): void;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
  }
}
