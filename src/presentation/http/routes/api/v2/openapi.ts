export const apiV2OpenApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Willi-Mako API v2',
    version: '0.2.0',
    description: 'Spezifikation für die API v2 (Phasen 1 & 2).'
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
      }
    }
  }
};
