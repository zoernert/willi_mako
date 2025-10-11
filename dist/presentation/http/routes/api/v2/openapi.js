"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV2OpenApiDocument = void 0;
exports.apiV2OpenApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Willi-Mako API v2',
        version: '0.1.0',
        description: 'Vorab-Spezifikation für die API v2 (Phase 1).'
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
            }
        }
    }
};
//# sourceMappingURL=openapi.js.map