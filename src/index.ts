import process from 'process'
import fastify from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { createClient } from '@clickhouse/client'

export const Connection = Type.Object({
  address: Type.String(), // ex: http://localhost:8123
  user: Type.Optional(Type.String()),
  password: Type.Optional(Type.String())
})

const RowElement = Type.Record(
  Type.String(),
  Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()])
);

const Data = Type.Union([
  Type.Object(RowElement),
  Type.Array(RowElement)
])

export const Query = Type.Object({
  connection: Connection,
  query: Type.String()
})

export const Insert = Type.Object({
  connection: Connection,
  database: Type.String(),
  table: Type.String(),
  data: Data
});

export const Column = Type.Object({
  name: Type.String(),
  type: Type.String()
});

export const CreateTableParams = Type.Object({
  connection: Connection,
  database: Type.String(),
  table: Type.String(),
  columns: Type.Array(Column),
  sortKey: Type.String()
});

export type CreateTableParamsType = Static<typeof CreateTableParams>;
export type InsertType = Static<typeof Insert>;
export type QueryType = Static<typeof Query>;

const server = fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

interface Response {
  200: { success: boolean };
  302: { url: string };
  '4xx': { error: string };
}

function errorMessage(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error ? JSON.stringify(error.message) : JSON.stringify(error);
}

server.post<{ Body: InsertType, Reply: Response }>
('/insert',
  async (request, reply) => {
  const  { address, user, password } = request.body.connection
  const client = createClient({
    host: address,
    username: user,
    password,
    application: 'async-inserts-demo'
  });

  const valuesArray = Array.isArray(request.body.data) ? request.body.data : [request.body.data];

  try {
    await client.insert({
      table: `${request.body.database}.${request.body.table}`,
      values: valuesArray,
      format: 'JSONEachRow',
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1
      }
    });

    reply.status(200).send({ success: true });
  } catch(error) {
    const message: string = errorMessage(error);
    reply.status(400).send({ error: message });
  }
})

server.post<{ Body: QueryType }>('/query', async (request, reply) => {
  const { address, user, password } = request.body.connection
  const client = createClient({
    host: address,
    username: user,
    password,
    application: 'async-inserts-demo'
  });

  try {
    const resultSet = await client.query({
      query: request.body.query,
      format: 'JSONEachRow',
      clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
    });
    const result = await resultSet.json();
    reply.status(200).send({ success: true, data: result });
  } catch(error) {
    const message: string = errorMessage(error);
    reply.status(400).send({ error: message });
  }
})

server.post<{ Body: CreateTableParamsType, Reply: Response }>(
  '/create-table',
  async (request, reply) => {
  console.log(request.body, typeof request.body);
  try {
    const { address, user, password } = request.body.connection
    console.log('params', address, user, password)

    const client = createClient({
      host: address,
      username: user,
      password,
      application: 'async-inserts-demo'
    });

    const getCreateSql = (tableName: string, columns: string, sortKey: string) => `
    CREATE TABLE ${tableName}
    (${columns})
    ORDER BY (${sortKey});
  `

    const { table, database, columns, sortKey } = request.body;
    const query = getCreateSql(`${database}.${table}`, columns.map(column => `${column.name} ${column.type}`).join(', '), sortKey)

    console.log('Creating table with query:', query);

    await client.command({
      query,
      // Recommended for cluster usage to avoid situations
      // where a query processing error occurred after the response code
      // and HTTP headers were sent to the client.
      // See https://clickhouse.com/docs/en/interfaces/http/#response-buffering
      clickhouse_settings: {
        wait_end_of_query: 1,
      },
    });
    reply.status(200).send({ success: true });
  } catch(error) {
    console.log('error', error)
    reply.status(400).send({ error: errorMessage(error) });
  }
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`);
})
