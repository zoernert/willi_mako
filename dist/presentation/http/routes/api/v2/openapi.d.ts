export declare const apiV2OpenApiDocument: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    paths: {
        '/auth/token': {
            post: {
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                accessToken: {
                                                    type: string;
                                                };
                                                expiresAt: {
                                                    type: string;
                                                    format: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sessions': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    preferences: {
                                        type: string;
                                        properties: {
                                            companiesOfInterest: {
                                                type: string;
                                                items: {
                                                    type: string;
                                                };
                                            };
                                            preferredTopics: {
                                                type: string;
                                                items: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                    contextSettings: {
                                        type: string;
                                    };
                                    ttlMinutes: {
                                        type: string;
                                        minimum: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/sessions/{sessionId}': {
            get: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '204': {
                        description: string;
                    };
                };
            };
        };
        '/chat': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    message: {
                                        type: string;
                                    };
                                    contextSettings: {
                                        type: string;
                                    };
                                    timelineId: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/retrieval/semantic-search': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    query: {
                                        type: string;
                                    };
                                    options: {
                                        type: string;
                                        properties: {
                                            limit: {
                                                type: string;
                                                minimum: number;
                                                maximum: number;
                                            };
                                            alpha: {
                                                type: string;
                                            };
                                            outlineScoping: {
                                                type: string;
                                            };
                                            excludeVisual: {
                                                type: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                sessionId: {
                                                    type: string;
                                                    format: string;
                                                };
                                                query: {
                                                    type: string;
                                                };
                                                totalResults: {
                                                    type: string;
                                                };
                                                durationMs: {
                                                    type: string;
                                                };
                                                options: {
                                                    type: string;
                                                    properties: {
                                                        limit: {
                                                            type: string;
                                                        };
                                                        alpha: {
                                                            type: string;
                                                            nullable: boolean;
                                                        };
                                                        outlineScoping: {
                                                            type: string;
                                                        };
                                                        excludeVisual: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                results: {
                                                    type: string;
                                                    items: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/reasoning/generate': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    query: {
                                        type: string;
                                    };
                                    messages: {
                                        type: string;
                                        items: {
                                            type: string;
                                            required: string[];
                                            properties: {
                                                role: {
                                                    type: string;
                                                };
                                                content: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                    contextSettingsOverride: {
                                        type: string;
                                    };
                                    preferencesOverride: {
                                        type: string;
                                    };
                                    overridePipeline: {
                                        type: string;
                                    };
                                    useDetailedIntentAnalysis: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                sessionId: {
                                                    type: string;
                                                    format: string;
                                                };
                                                response: {
                                                    type: string;
                                                };
                                                reasoningSteps: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                    };
                                                };
                                                finalQuality: {
                                                    type: string;
                                                };
                                                iterationsUsed: {
                                                    type: string;
                                                };
                                                contextAnalysis: {
                                                    type: string;
                                                };
                                                qaAnalysis: {
                                                    type: string;
                                                };
                                                pipelineDecisions: {
                                                    type: string;
                                                };
                                                apiCallsUsed: {
                                                    type: string;
                                                };
                                                hybridSearchUsed: {
                                                    type: string;
                                                };
                                                hybridSearchAlpha: {
                                                    type: string;
                                                    nullable: boolean;
                                                };
                                                metadata: {
                                                    type: string;
                                                    properties: {
                                                        sessionId: {
                                                            type: string;
                                                            format: string;
                                                        };
                                                        usedDetailedIntentAnalysis: {
                                                            type: string;
                                                        };
                                                        usedOverridePipeline: {
                                                            type: string;
                                                        };
                                                        contextSettings: {
                                                            type: string;
                                                        };
                                                        preferences: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/context/resolve': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    query: {
                                        type: string;
                                    };
                                    messages: {
                                        type: string;
                                        items: {
                                            type: string;
                                            required: string[];
                                            properties: {
                                                role: {
                                                    type: string;
                                                };
                                                content: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                    contextSettingsOverride: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                sessionId: {
                                                    type: string;
                                                    format: string;
                                                };
                                                contextSettingsUsed: {
                                                    type: string;
                                                };
                                                decision: {
                                                    type: string;
                                                };
                                                publicContext: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                    };
                                                };
                                                userContext: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/clarification/analyze': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    query: {
                                        type: string;
                                    };
                                    includeEnhancedQuery: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                sessionId: {
                                                    type: string;
                                                    format: string;
                                                };
                                                query: {
                                                    type: string;
                                                };
                                                analysis: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/tools/generate-script': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/tools/run-node-script': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    source: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    timeoutMs: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                    };
                                    metadata: {
                                        type: string;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '202': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                sessionId: {
                                                    type: string;
                                                    format: string;
                                                };
                                                job: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/tools/jobs/{jobId}': {
            get: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                job: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/artifacts': {
            post: {
                summary: string;
                security: {
                    bearerAuth: any[];
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    sessionId: {
                                        type: string;
                                        format: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    name: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    mimeType: {
                                        type: string;
                                    };
                                    encoding: {
                                        type: string;
                                        enum: string[];
                                    };
                                    content: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    version: {
                                        type: string;
                                    };
                                    tags: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                        maxItems: number;
                                    };
                                    metadata: {
                                        type: string;
                                        additionalProperties: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        data: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    components: {
        securitySchemes: {
            bearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
            };
        };
        schemas: {
            SessionEnvelopeResponse: {
                type: string;
                properties: {
                    success: {
                        type: string;
                    };
                    data: {
                        $ref: string;
                    };
                };
            };
            SessionEnvelope: {
                type: string;
                required: string[];
                properties: {
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    userId: {
                        type: string;
                        format: string;
                    };
                    legacyChatId: {
                        type: string;
                        format: string;
                    };
                    workspaceContext: {
                        type: string;
                    };
                    policyFlags: {
                        type: string;
                        properties: {
                            role: {
                                type: string;
                            };
                            canAccessCs30: {
                                type: string;
                            };
                        };
                    };
                    preferences: {
                        type: string;
                        properties: {
                            companiesOfInterest: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            preferredTopics: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                        };
                    };
                    contextSettings: {
                        type: string;
                    };
                    expiresAt: {
                        type: string;
                        format: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            SemanticSearchResultItem: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    score: {
                        type: string;
                        nullable: boolean;
                    };
                    payload: {
                        type: string;
                    };
                    highlight: {
                        type: string;
                        nullable: boolean;
                    };
                    metadata: {
                        type: string;
                        properties: {
                            rank: {
                                type: string;
                            };
                            originalScore: {
                                type: string;
                                nullable: boolean;
                            };
                            mergedScore: {
                                type: string;
                                nullable: boolean;
                            };
                            version: {
                                oneOf: {
                                    type: string;
                                }[];
                            };
                        };
                    };
                };
            };
            ClarificationQuestion: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    question: {
                        type: string;
                    };
                    category: {
                        type: string;
                        enum: string[];
                    };
                    options: {
                        type: string;
                        items: {
                            type: string;
                        };
                        nullable: boolean;
                    };
                    priority: {
                        type: string;
                    };
                };
            };
            ClarificationAnalysis: {
                type: string;
                properties: {
                    clarificationNeeded: {
                        type: string;
                    };
                    ambiguityScore: {
                        type: string;
                    };
                    detectedTopics: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    reasoning: {
                        type: string;
                    };
                    suggestedQuestions: {
                        type: string;
                        items: {
                            $ref: string;
                        };
                    };
                    clarificationSessionId: {
                        type: string;
                        nullable: boolean;
                    };
                    enhancedQuery: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            ToolJobSourceInfo: {
                type: string;
                properties: {
                    language: {
                        type: string;
                        enum: string[];
                    };
                    hash: {
                        type: string;
                    };
                    bytes: {
                        type: string;
                    };
                    preview: {
                        type: string;
                    };
                    lineCount: {
                        type: string;
                    };
                };
            };
            ToolJobResult: {
                type: string;
                properties: {
                    completedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    durationMs: {
                        type: string;
                        nullable: boolean;
                    };
                    stdout: {
                        type: string;
                        nullable: boolean;
                    };
                    stderr: {
                        type: string;
                        nullable: boolean;
                    };
                    error: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            ToolJobDiagnostics: {
                type: string;
                properties: {
                    executionEnabled: {
                        type: string;
                    };
                    notes: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
            };
            ToolJob: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        format: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                    };
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                    timeoutMs: {
                        type: string;
                    };
                    metadata: {
                        type: string;
                        nullable: boolean;
                    };
                    source: {
                        $ref: string;
                    };
                    result: {
                        oneOf: ({
                            $ref: string;
                            type?: undefined;
                        } | {
                            type: string;
                            $ref?: undefined;
                        })[];
                    };
                    warnings: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    diagnostics: {
                        $ref: string;
                    };
                };
            };
            ToolScriptValidationReport: {
                type: string;
                properties: {
                    syntaxValid: {
                        type: string;
                    };
                    deterministic: {
                        type: string;
                    };
                    forbiddenApis: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    warnings: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
            };
            ToolScriptDescriptor: {
                type: string;
                required: string[];
                properties: {
                    code: {
                        type: string;
                    };
                    language: {
                        type: string;
                        enum: string[];
                    };
                    entrypoint: {
                        type: string;
                        enum: string[];
                    };
                    description: {
                        type: string;
                    };
                    runtime: {
                        type: string;
                        enum: string[];
                    };
                    deterministic: {
                        type: string;
                    };
                    dependencies: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    source: {
                        $ref: string;
                    };
                    validation: {
                        $ref: string;
                    };
                    notes: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
            };
            ToolScriptInputSchemaProperty: {
                type: string;
                properties: {
                    type: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    example: {};
                };
            };
            ToolScriptInputSchema: {
                type: string;
                properties: {
                    type: {
                        type: string;
                        enum: string[];
                    };
                    description: {
                        type: string;
                    };
                    properties: {
                        type: string;
                        additionalProperties: {
                            $ref: string;
                        };
                    };
                    required: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
            };
            ToolScriptConstraints: {
                type: string;
                properties: {
                    deterministic: {
                        type: string;
                    };
                    allowNetwork: {
                        type: string;
                    };
                    allowFilesystem: {
                        type: string;
                    };
                    maxRuntimeMs: {
                        type: string;
                        minimum: number;
                        maximum: number;
                    };
                };
            };
            GenerateToolScriptRequest: {
                type: string;
                required: string[];
                properties: {
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    instructions: {
                        type: string;
                        maxLength: number;
                    };
                    inputSchema: {
                        $ref: string;
                    };
                    expectedOutputDescription: {
                        type: string;
                        maxLength: number;
                    };
                    additionalContext: {
                        type: string;
                        maxLength: number;
                    };
                    constraints: {
                        $ref: string;
                    };
                };
            };
            GenerateToolScriptResponse: {
                type: string;
                properties: {
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    script: {
                        $ref: string;
                    };
                    inputSchema: {
                        $ref: string;
                    };
                    expectedOutputDescription: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            ArtifactStorage: {
                type: string;
                properties: {
                    mode: {
                        type: string;
                        enum: string[];
                    };
                    encoding: {
                        type: string;
                        enum: string[];
                    };
                    content: {
                        type: string;
                    };
                };
            };
            Artifact: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        format: string;
                    };
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    name: {
                        type: string;
                    };
                    type: {
                        type: string;
                    };
                    mimeType: {
                        type: string;
                    };
                    byteSize: {
                        type: string;
                    };
                    checksum: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                    storage: {
                        $ref: string;
                    };
                    preview: {
                        type: string;
                        nullable: boolean;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                    };
                    version: {
                        type: string;
                        nullable: boolean;
                    };
                    tags: {
                        type: string;
                        items: {
                            type: string;
                        };
                        nullable: boolean;
                    };
                    metadata: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            CreateArtifactResponse: {
                type: string;
                properties: {
                    sessionId: {
                        type: string;
                        format: string;
                    };
                    artifact: {
                        $ref: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=openapi.d.ts.map