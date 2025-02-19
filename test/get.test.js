const test = require('tape')
const path = require('path')
const os = require('os')
const rimraf = require('rimraf')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')
const p = require('util').promisify
const FeedV1 = require('../lib/feed-v1')
const { generateKeypair } = require('./util')

const DIR = path.join(os.tmpdir(), 'ppppp-db-get')
rimraf.sync(DIR)

const keys = generateKeypair('alice')
let peer
let msgHash1
let msgId1
test('setup', async (t) => {
  peer = SecretStack({ appKey: caps.shs })
    .use(require('../lib'))
    .use(require('ssb-box'))
    .call(null, { keys, path: DIR })

  await peer.db.loaded()

  const rec1 = await p(peer.db.create)({
    type: 'post',
    content: { text: 'I am 1st post' },
  })
  msgHash1 = FeedV1.getMsgHash(rec1.msg)
  msgId1 = FeedV1.getMsgId(rec1.msg)
})

test('get() supports ppppp URIs', async (t) => {
  const msg = peer.db.get(msgId1)
  t.ok(msg, 'msg exists')
  t.equals(msg.content.text, 'I am 1st post')
})

test('get() supports msg hashes', async (t) => {
  const msg = peer.db.get(msgHash1)
  t.ok(msg, 'msg exists')
  t.equals(msg.content.text, 'I am 1st post')
})

test('teardown', (t) => {
  peer.close(t.end)
})
