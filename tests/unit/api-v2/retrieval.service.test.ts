jest.mock('../../../src/services/qdrant', () => ({
  QdrantService: {
    semanticSearchGuided: jest.fn()
  }
}));

import { retrievalService } from '../../../src/services/api-v2/retrieval.service';
import { QdrantService } from '../../../src/services/qdrant';

const mockedSemanticSearch = QdrantService.semanticSearchGuided as jest.Mock;

describe('RetrievalService', () => {
  beforeEach(() => {
    mockedSemanticSearch.mockReset();
  });

  it('maps semantic search results into response schema', async () => {
    mockedSemanticSearch.mockResolvedValue([
      {
        id: 'point-1',
        score: 0.91,
        payload: { text: 'Lorem ipsum dolor sit amet' }
      },
      {
        id: { uuid: 'point-2' },
        merged_score: 0.83,
        score: 0.72,
        payload: { content: 'Consetetur sadipscing elitr' },
        version: 3
      }
    ]);

    const query = 'prozess GPKE';
    const result = await retrievalService.semanticSearch(query, { limit: 5, outlineScoping: false });

    expect(mockedSemanticSearch).toHaveBeenCalledWith(query, { limit: 5, outlineScoping: false });
    expect(result.query).toBe(query);
    expect(result.totalResults).toBe(2);
    expect(result.results[0].id).toBe('point-1');
    expect(result.results[0].highlight).toBe('Lorem ipsum dolor sit amet');
    expect(result.results[1].id).toBe('point-2');
    expect(result.results[1].metadata.version).toBe(3);
    expect(result.options.limit).toBe(5);
    expect(result.options.outlineScoping).toBe(false);
  });
});
