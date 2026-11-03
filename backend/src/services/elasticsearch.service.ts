import { getElasticsearchClient, isElasticsearchAvailable } from '../config/elasticsearch.js';
import { prisma } from '../config/prisma.js';
import { EmailStatus } from '../types/index.js';

export interface IndexEmailInput {
  id: string;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}

export async function indexEmailInElasticsearch(data: IndexEmailInput): Promise<void> {
  const client = getElasticsearchClient();
  if (!client || !isElasticsearchAvailable()) return;

  try {
    await client.index({
      index: 'emails',
      id: data.id,
      document: {
        id: data.id,
        recipient: data.recipient,
        senderEmail: data.senderEmail,
        subject: data.subject,
        body: data.body,
        status: data.status,
        scheduledAt: data.scheduledAt.toISOString(),
        sentAt: data.sentAt ? data.sentAt.toISOString() : null,
        createdAt: data.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.warn(`[Elasticsearch] Indexing failed for email ${data.id}:`, error);
  }
}

export async function updateEmailStatusInElasticsearch(
  id: string,
  status: string,
  sentAt?: Date | null
): Promise<void> {
  const client = getElasticsearchClient();
  if (!client || !isElasticsearchAvailable()) return;

  try {
    await client.update({
      index: 'emails',
      id,
      doc: {
        status,
        sentAt: sentAt ? sentAt.toISOString() : null,
      },
    });
  } catch {
    // If not found in ES, silently ignore or re-index
  }
}

export interface SearchOptions {
  query?: string;
  status?: EmailStatus;
  senderId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  source: 'elasticsearch' | 'database';
  total: number;
  emails: any[];
}

export async function searchEmails(options: SearchOptions): Promise<SearchResult> {
  const { query, status, senderId, limit = 50, offset = 0 } = options;
  const client = getElasticsearchClient();

  if (client && isElasticsearchAvailable() && query && query.trim().length > 0) {
    try {
      const mustClauses: any[] = [
        {
          multi_match: {
            query: query.trim(),
            fields: ['recipient^3', 'subject^2', 'body', 'senderEmail'],
            fuzziness: 'AUTO',
          },
        },
      ];

      if (status) {
        mustClauses.push({ term: { status } });
      }

      const response = await client.search({
        index: 'emails',
        from: offset,
        size: limit,
        query: {
          bool: {
            must: mustClauses,
          },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
      });

      const hits = response.hits.hits;
      const ids = hits.map((h: any) => h._id);

      if (ids.length > 0) {
        const fullRecords = await prisma.email.findMany({
          where: { id: { in: ids } },
          include: { sender: true },
        });

        // Retain ES relevance ranking order
        const recordMap = new Map(fullRecords.map((r) => [r.id, r]));
        const ordered = ids.map((id) => recordMap.get(id)).filter(Boolean);

        return {
          source: 'elasticsearch',
          total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
          emails: ordered,
        };
      }
    } catch (err) {
      console.warn('[Elasticsearch] Search query error, falling back to DB:', err);
    }
  }

  // Graceful fallback to PostgreSQL
  const where: any = {};
  if (status) where.status = status;
  if (senderId) where.senderId = senderId;
  if (query && query.trim().length > 0) {
    const q = query.trim();
    where.OR = [
      { recipient: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } },
      { sender: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, emails] = await Promise.all([
    prisma.email.count({ where }),
    prisma.email.findMany({
      where,
      include: { sender: true },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  return {
    source: 'database',
    total,
    emails,
  };
}
