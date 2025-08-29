# Reindex to OpenAI and Mistral Collections

This script crawls your existing Qdrant collection and creates two provider-specific collections with the same point IDs:

- <base>_openai (dimension = 1536 by default)
- <base>_mistral (dimension = 1024 by default)

It reads the full chunk text from the payload where available (payload.text, payload.content, FAQ fields) and embeds them with the respective providers. If only `text_content_sample` is present, it will use that as a degraded fallback.

The script is resumable: it stores a cursor and appends processed IDs to a JSONL file under `scripts/.reindex-state/`.

## Usage

1. Set environment variables in `.env`:

```
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
# Optional overrides
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_EMBED_DIM=1536
MISTRAL_EMBED_MODEL=mistral-embed
MISTRAL_EMBED_DIM=1024
REINDEX_SCROLL_LIMIT=256
REINDEX_UPSERT_BATCH=64
```

2. Run:

```
npm run reindex:providers
```

You can stop anytime; running again resumes from the saved cursor.

## Notes
- Existing collection name is read from `QDRANT_COLLECTION` in `.env`.
- New collections are created if missing: `<base>_openai`, `<base>_mistral`.
- If you later move to named vectors in a single collection, you can adapt the upsert calls accordingly.
