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
        };
    };
};
//# sourceMappingURL=openapi.d.ts.map