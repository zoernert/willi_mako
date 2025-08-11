"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const QDRANT_URL = process.env.QDRANT_URL || 'http://10.0.0.2:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'str0mdao0';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'willi';
const qdrantClient = axios_1.default.create({
    baseURL: QDRANT_URL,
    headers: {
        'Content-Type': 'application/json',
        'api-key': QDRANT_API_KEY,
    },
});
class QdrantService {
    async createCollection(vectorSize = 1536) {
        try {
            const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}`, {
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine',
                },
                optimizers_config: {
                    default_segment_number: 2,
                },
                replication_factor: 2,
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 409) {
                console.log('Collection already exists');
                return { status: 'exists' };
            }
            throw error;
        }
    }
    async insertPoints(points) {
        try {
            const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}/points`, {
                points: points,
            });
            return response.data;
        }
        catch (error) {
            console.error('Error inserting points:', error);
            throw error;
        }
    }
    async searchSimilar(queryVector, limit = 10, scoreThreshold = 0.7) {
        try {
            const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/search`, {
                vector: queryVector,
                limit: limit,
                score_threshold: scoreThreshold,
                with_payload: true,
            });
            return response.data.result.map((item) => ({
                id: item.id,
                score: item.score,
                payload: item.payload,
            }));
        }
        catch (error) {
            console.error('Error searching similar vectors:', error);
            throw error;
        }
    }
    async searchByText(queryText, limit = 10, scoreThreshold = 0.7) {
        try {
            const GeminiService = require('./gemini').default;
            const queryVector = await GeminiService.generateEmbedding(queryText);
            return await this.searchSimilar(queryVector, limit, scoreThreshold);
        }
        catch (error) {
            console.error('Error searching by text:', error);
            return [];
        }
    }
    async deletePoints(pointIds) {
        try {
            const response = await qdrantClient.post(`/collections/${COLLECTION_NAME}/points/delete`, {
                points: pointIds,
            });
            return response.data;
        }
        catch (error) {
            console.error('Error deleting points:', error);
            throw error;
        }
    }
    async getCollection() {
        try {
            const response = await qdrantClient.get(`/collections/${COLLECTION_NAME}`);
            return response.data;
        }
        catch (error) {
            console.error('Error getting collection info:', error);
            throw error;
        }
    }
    async updatePoint(pointId, point) {
        try {
            const response = await qdrantClient.put(`/collections/${COLLECTION_NAME}/points`, {
                points: [
                    {
                        id: pointId,
                        ...point,
                    },
                ],
            });
            return response.data;
        }
        catch (error) {
            console.error('Error updating point:', error);
            throw error;
        }
    }
    async testConnection() {
        try {
            const response = await qdrantClient.get('/collections');
            console.log('Qdrant connection test successful');
        }
        catch (error) {
            console.error('Qdrant connection test failed:', error);
            throw error;
        }
    }
}
exports.QdrantService = QdrantService;
exports.default = new QdrantService();
//# sourceMappingURL=qdrant.js.map