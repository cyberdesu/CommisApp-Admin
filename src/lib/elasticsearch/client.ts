import "server-only";
import { Client } from "@elastic/elasticsearch";

declare const globalThis: {
  esClientGlobal?: Client;
} & typeof global;

function createClient(): Client {
  const node = process.env.ES_NODE || "http://127.0.0.1:9200";
  const apiKey = process.env.ES_API_KEY;
  const username = process.env.ES_USERNAME;
  const password = process.env.ES_PASSWORD;

  return new Client({
    node,
    requestTimeout: 30_000,
    auth: apiKey
      ? { apiKey }
      : username && password
        ? { username, password }
        : undefined,
  });
}

export const esClient: Client =
  globalThis.esClientGlobal ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.esClientGlobal = esClient;
}

export async function ensureIndex(
  index: string,
  settings: Record<string, unknown>,
  mappings: Record<string, unknown>,
): Promise<void> {
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    await esClient.indices.create({
      index,
      settings: settings as never,
      mappings: mappings as never,
    });
    return;
  }

  const mappingBody = mappings as Record<string, unknown>;
  await esClient.indices.putMapping({
    index,
    ...mappingBody,
  });
}

export async function bulkIndex(
  index: string,
  docs: { id: string; body: Record<string, unknown> }[],
  batchSize: number,
): Promise<number> {
  let indexed = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const slice = docs.slice(i, i + batchSize);
    const operations = slice.flatMap((d) => [
      { index: { _index: index, _id: d.id } },
      d.body,
    ]);
    const res = await esClient.bulk({ refresh: false, operations });
    if (res.errors) {
      for (const item of res.items) {
        const op = item.index;
        if (!op?.error) indexed += 1;
      }
    } else {
      indexed += slice.length;
    }
  }
  return indexed;
}

export async function deleteIndex(index: string): Promise<boolean> {
  const exists = await esClient.indices.exists({ index });
  if (!exists) return false;

  await esClient.indices.delete({ index });
  return true;
}
