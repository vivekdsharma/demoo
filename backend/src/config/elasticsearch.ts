import { Client } from '@elastic/elasticsearch';
import { config } from './env.js';

let esClient: Client | null = null;
let esAvailable = false;

export function getElasticsearchClient(): Client | null {
  if (!esClient) {
    try {
      esClient = new Client({
        node: config.elasticsearch.node,
        maxRetries: 2,
        requestTimeout: 3000,
      });
    } catch (err) {
      console.warn('[Elasticsearch] Could not initialize client:', err);
      esClient = null;
    }
  }
  return esClient;
}

export function isElasticsearchAvailable(): boolean {
  return esAvailable;
}

export async function initElasticsearch(): Promise<void> {
  const client = getElasticsearchClient();
  if (!client) {
    esAvailable = false;
    return;
  }

  try {
    const health = await client.ping();
    if (health) {
      esAvailable = true;
      console.log('[Elasticsearch] Connected and healthy');
      await ensureIndices();
    }
  } catch {
    esAvailable = false;
    console.log('[Elasticsearch] Server not reachable. Graceful fallback to PostgreSQL search active.');
  }
}

async function ensureIndices(): Promise<void> {
  const client = getElasticsearchClient();
  if (!client || !esAvailable) return;

  try {
    const exists = await client.indices.exists({ index: 'emails' });
    if (!exists) {
      await client.indices.create({
        index: 'emails',
        mappings: {
          properties: {
            id: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            senderEmail: { type: 'keyword' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log('[Elasticsearch] Created index: emails');
    }
  } catch (error) {
    console.warn('[Elasticsearch] Failed ensuring index:', error);
  }
}
