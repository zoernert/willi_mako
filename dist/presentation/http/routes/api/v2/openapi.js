"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV2OpenApiDocument = void 0;
exports.apiV2OpenApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Willi-Mako API v2',
        version: '0.4.0',
        description: 'Spezifikation für die API v2 (Phasen 1 bis 3 – Tooling & Artefakte).'
    },
    servers: [
        {
            url: '/api/v2',
            description: 'Relative API v2 Base'
        }
    ],
    paths: {
        '/auth/token': {
            post: {
                summary: 'JWT Token erhalten',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: {
                                        type: 'string',
                                        format: 'email'
                                    },
                                    password: {
                                        type: 'string',
                                        format: 'password'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Token erfolgreich erstellt',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                accessToken: { type: 'string' },
                                                expiresAt: { type: 'string', format: 'date-time' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/sessions': {
            post: {
                summary: 'Session erstellen',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    preferences: {
                                        type: 'object',
                                        properties: {
                                            companiesOfInterest: {
                                                type: 'array',
                                                items: { type: 'string' }
                                            },
                                            preferredTopics: {
                                                type: 'array',
                                                items: { type: 'string' }
                                            }
                                        }
                                    },
                                    contextSettings: { type: 'object' },
                                    ttlMinutes: { type: 'integer', minimum: 1 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Session erfolgreich erstellt',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SessionEnvelopeResponse'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/sessions/{sessionId}': {
            get: {
                summary: 'Session abrufen',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'sessionId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Session gefunden',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SessionEnvelopeResponse'
                                }
                            }
                        }
                    }
                }
            },
            delete: {
                summary: 'Session löschen',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'sessionId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' }
                    }
                ],
                responses: {
                    '204': {
                        description: 'Session gelöscht'
                    }
                }
            }
        },
        '/chat': {
            post: {
                summary: 'Parität-Chat ausführen',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'message'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    message: { type: 'string' },
                                    contextSettings: { type: 'object' },
                                    timelineId: { type: 'string', format: 'uuid' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Antwort aus Legacy-Chat',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/retrieval/semantic-search': {
            post: {
                summary: 'Semantische Suche ausführen',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'query'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    query: { type: 'string' },
                                    options: {
                                        type: 'object',
                                        properties: {
                                            limit: { type: 'integer', minimum: 1, maximum: 100 },
                                            alpha: { type: 'number' },
                                            outlineScoping: { type: 'boolean' },
                                            excludeVisual: { type: 'boolean' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Trefferliste der semantischen Suche',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sessionId: { type: 'string', format: 'uuid' },
                                                query: { type: 'string' },
                                                totalResults: { type: 'integer' },
                                                durationMs: { type: 'number' },
                                                options: {
                                                    type: 'object',
                                                    properties: {
                                                        limit: { type: 'integer' },
                                                        alpha: { type: 'number', nullable: true },
                                                        outlineScoping: { type: 'boolean' },
                                                        excludeVisual: { type: 'boolean' }
                                                    }
                                                },
                                                results: {
                                                    type: 'array',
                                                    items: {
                                                        $ref: '#/components/schemas/SemanticSearchResultItem'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/reasoning/generate': {
            post: {
                summary: 'Fortgeschrittenes Reasoning ausführen',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'query'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    query: { type: 'string' },
                                    messages: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['role', 'content'],
                                            properties: {
                                                role: { type: 'string' },
                                                content: { type: 'string' }
                                            }
                                        }
                                    },
                                    contextSettingsOverride: { type: 'object' },
                                    preferencesOverride: { type: 'object' },
                                    overridePipeline: { type: 'object' },
                                    useDetailedIntentAnalysis: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Generiertes Reasoning Ergebnis',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sessionId: { type: 'string', format: 'uuid' },
                                                response: { type: 'string' },
                                                reasoningSteps: { type: 'array', items: { type: 'object' } },
                                                finalQuality: { type: 'number' },
                                                iterationsUsed: { type: 'integer' },
                                                contextAnalysis: { type: 'object' },
                                                qaAnalysis: { type: 'object' },
                                                pipelineDecisions: { type: 'object' },
                                                apiCallsUsed: { type: 'integer' },
                                                hybridSearchUsed: { type: 'boolean' },
                                                hybridSearchAlpha: { type: 'number', nullable: true },
                                                metadata: {
                                                    type: 'object',
                                                    properties: {
                                                        sessionId: { type: 'string', format: 'uuid' },
                                                        usedDetailedIntentAnalysis: { type: 'boolean' },
                                                        usedOverridePipeline: { type: 'boolean' },
                                                        contextSettings: { type: 'object' },
                                                        preferences: { type: 'object' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/context/resolve': {
            post: {
                summary: 'Arbeitsplatz-Kontext ermitteln',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'query'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    query: { type: 'string' },
                                    messages: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['role', 'content'],
                                            properties: {
                                                role: { type: 'string' },
                                                content: { type: 'string' }
                                            }
                                        }
                                    },
                                    contextSettingsOverride: { type: 'object' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Kontext-Entscheidung und Ressourcen',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sessionId: { type: 'string', format: 'uuid' },
                                                contextSettingsUsed: { type: 'object' },
                                                decision: { type: 'object' },
                                                publicContext: {
                                                    type: 'array',
                                                    items: { type: 'string' }
                                                },
                                                userContext: { type: 'object' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/clarification/analyze': {
            post: {
                summary: 'Klarstellungsbedarf für eine Anfrage analysieren',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'query'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    query: { type: 'string' },
                                    includeEnhancedQuery: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Analyse des Klarstellungsbedarfs',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sessionId: { type: 'string', format: 'uuid' },
                                                query: { type: 'string' },
                                                analysis: {
                                                    $ref: '#/components/schemas/ClarificationAnalysis'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/tools/run-node-script': {
            post: {
                summary: 'Node.js Skript als Sandbox-Job registrieren',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'source'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    source: { type: 'string', maxLength: 4000 },
                                    timeoutMs: { type: 'integer', minimum: 500, maximum: 60000 },
                                    metadata: {
                                        type: 'object',
                                        description: 'Optionale Hinweise für spätere Jobs (z. B. beabsichtigte Artefakte).'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '202': {
                        description: 'Job aufgenommen (Ausführung benötigt manuelle Freigabe).',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sessionId: { type: 'string', format: 'uuid' },
                                                job: {
                                                    $ref: '#/components/schemas/ToolJob'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/tools/jobs/{jobId}': {
            get: {
                summary: 'Tool-Job Status abrufen',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'jobId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Aktueller Status des Jobs',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                job: {
                                                    $ref: '#/components/schemas/ToolJob'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/artifacts': {
            post: {
                summary: 'Artefakt für eine Session speichern',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sessionId', 'type', 'name', 'mimeType', 'encoding', 'content'],
                                properties: {
                                    sessionId: { type: 'string', format: 'uuid' },
                                    type: { type: 'string' },
                                    name: { type: 'string', maxLength: 120 },
                                    mimeType: { type: 'string' },
                                    encoding: { type: 'string', enum: ['utf8', 'base64'] },
                                    content: { type: 'string' },
                                    description: { type: 'string', maxLength: 2000 },
                                    version: { type: 'string' },
                                    tags: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        maxItems: 12
                                    },
                                    metadata: { type: 'object', additionalProperties: true }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Artefakt wurde eingelagert',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            $ref: '#/components/schemas/CreateArtifactResponse'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            SessionEnvelopeResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        $ref: '#/components/schemas/SessionEnvelope'
                    }
                }
            },
            SessionEnvelope: {
                type: 'object',
                required: ['sessionId', 'userId', 'workspaceContext', 'policyFlags', 'preferences', 'expiresAt'],
                properties: {
                    sessionId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    legacyChatId: { type: 'string', format: 'uuid' },
                    workspaceContext: { type: 'object' },
                    policyFlags: {
                        type: 'object',
                        properties: {
                            role: { type: 'string' },
                            canAccessCs30: { type: 'boolean' }
                        }
                    },
                    preferences: {
                        type: 'object',
                        properties: {
                            companiesOfInterest: {
                                type: 'array',
                                items: { type: 'string' }
                            },
                            preferredTopics: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        }
                    },
                    contextSettings: { type: 'object' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            SemanticSearchResultItem: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    score: { type: 'number', nullable: true },
                    payload: { type: 'object' },
                    highlight: { type: 'string', nullable: true },
                    metadata: {
                        type: 'object',
                        properties: {
                            rank: { type: 'integer' },
                            originalScore: { type: 'number', nullable: true },
                            mergedScore: { type: 'number', nullable: true },
                            version: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] }
                        }
                    }
                }
            },
            ClarificationQuestion: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    question: { type: 'string' },
                    category: {
                        type: 'string',
                        enum: ['scope', 'context', 'detail_level', 'stakeholder', 'energy_type']
                    },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        nullable: true
                    },
                    priority: { type: 'integer' }
                }
            },
            ClarificationAnalysis: {
                type: 'object',
                properties: {
                    clarificationNeeded: { type: 'boolean' },
                    ambiguityScore: { type: 'number' },
                    detectedTopics: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    reasoning: { type: 'string' },
                    suggestedQuestions: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ClarificationQuestion' }
                    },
                    clarificationSessionId: { type: 'string', nullable: true },
                    enhancedQuery: { type: 'string', nullable: true }
                }
            },
            ToolJobSourceInfo: {
                type: 'object',
                properties: {
                    language: { type: 'string', enum: ['node'] },
                    hash: { type: 'string' },
                    bytes: { type: 'integer' },
                    preview: { type: 'string' },
                    lineCount: { type: 'integer' }
                }
            },
            ToolJobResult: {
                type: 'object',
                properties: {
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    durationMs: { type: 'integer', nullable: true },
                    stdout: { type: 'string', nullable: true },
                    stderr: { type: 'string', nullable: true },
                    error: { type: 'string', nullable: true }
                }
            },
            ToolJobDiagnostics: {
                type: 'object',
                properties: {
                    executionEnabled: { type: 'boolean' },
                    notes: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            ToolJob: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    type: { type: 'string', enum: ['run-node-script'] },
                    sessionId: { type: 'string', format: 'uuid' },
                    status: {
                        type: 'string',
                        enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled']
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    timeoutMs: { type: 'integer' },
                    metadata: { type: 'object', nullable: true },
                    source: {
                        $ref: '#/components/schemas/ToolJobSourceInfo'
                    },
                    result: {
                        oneOf: [
                            { $ref: '#/components/schemas/ToolJobResult' },
                            { type: 'null' }
                        ]
                    },
                    warnings: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    diagnostics: {
                        $ref: '#/components/schemas/ToolJobDiagnostics'
                    }
                }
            },
            ArtifactStorage: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['inline'] },
                    encoding: { type: 'string', enum: ['utf8', 'base64'] },
                    content: { type: 'string' }
                }
            },
            Artifact: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    sessionId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    mimeType: { type: 'string' },
                    byteSize: { type: 'integer' },
                    checksum: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    storage: {
                        $ref: '#/components/schemas/ArtifactStorage'
                    },
                    preview: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    version: { type: 'string', nullable: true },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        nullable: true
                    },
                    metadata: { type: 'object', nullable: true }
                }
            },
            CreateArtifactResponse: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string', format: 'uuid' },
                    artifact: {
                        $ref: '#/components/schemas/Artifact'
                    }
                }
            }
        }
    }
};
//# sourceMappingURL=openapi.js.map