import { afterAll, beforeAll } from 'bun:test';
import talkback from 'talkback';

const opts = {
  host: 'localhost:4000',
  record: talkback.Options.RecordMode.NEW,
  port: 4001,
  path: './tapes',
  silent: true,
};
const server = talkback(opts);

beforeAll(async () => {
  await server.start(() => console.log('Talkback Started'));
});

afterAll(() => {
  console.log('Talkback Stopped');
  server.close();
});
