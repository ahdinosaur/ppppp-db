const tape = require('tape')
const base58 = require('bs58')
const FeedV1 = require('../lib/feed-v1')
const { generateKeypair } = require('./util')

tape('invalid msg with non-array prev', (t) => {
  const keys = generateKeypair('alice')

  const rootMsg = FeedV1.createRoot(keys, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)

  const tangle = new FeedV1.Tangle(rootHash)
  tangle.add(rootHash, rootMsg)

  const msg = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030001000,
  })
  msg.metadata.tangles[rootHash].prev = null
  const msgHash = FeedV1.getMsgHash(msg)

  FeedV1.validate(msg, tangle, msgHash, rootHash, (err) => {
    t.ok(err, 'invalid 2nd msg throws')
    t.match(err.message, /prev must be an array/, 'invalid 2nd msg description')
    t.end()
  })
})

tape('invalid msg with bad prev', (t) => {
  const keys = generateKeypair('alice')

  const rootMsg = FeedV1.createRoot(keys, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)

  const tangle = new FeedV1.Tangle(rootHash)
  tangle.add(rootHash, rootMsg)

  const msg1 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030001000,
  })
  const msgHash1 = FeedV1.getMsgHash(msg1)
  tangle.add(msgHash1, msg1)

  const msg2 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030002000,
  })
  msg2.metadata.tangles[rootHash].depth = 1
  msg2.metadata.tangles[rootHash].prev = [1234]
  const msgHash2 = FeedV1.getMsgHash(msg2)

  FeedV1.validate(msg2, tangle, msgHash2, rootHash, (err) => {
    t.ok(err, 'invalid 2nd msg throws')
    t.match(
      err.message,
      /prev must contain strings/,
      'invalid 2nd msg description'
    )
    t.end()
  })
})

tape('invalid msg with URI in prev', (t) => {
  const keys = generateKeypair('alice')

  const rootMsg = FeedV1.createRoot(keys, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)

  const tangle = new FeedV1.Tangle(rootHash)
  tangle.add(rootHash, rootMsg)

  const msg1 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030001000,
  })
  const msgHash1 = FeedV1.getMsgHash(msg1)
  tangle.add(msgHash1, msg1)

  const msg2 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030002000,
  })
  const msgHash2 = FeedV1.getMsgHash(msg2)
  const randBuf = Buffer.alloc(16).fill(16)
  const fakeMsgKey1 = `ppppp:message/v1/${base58.encode(randBuf)}`
  msg2.metadata.tangles[rootHash].depth = 1
  msg2.metadata.tangles[rootHash].prev = [fakeMsgKey1]

  FeedV1.validate(msg2, tangle, msgHash2, rootHash, (err) => {
    t.ok(err, 'invalid 2nd msg throws')
    t.match(
      err.message,
      /prev must not contain URIs/,
      'invalid 2nd msg description'
    )
    t.end()
  })
})

tape('invalid msg with unknown prev', (t) => {
  const keys = generateKeypair('alice')

  const rootMsg = FeedV1.createRoot(keys, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)

  const tangle = new FeedV1.Tangle(rootHash)
  tangle.add(rootHash, rootMsg)

  const msg1 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030001000,
  })
  const msgHash1 = FeedV1.getMsgHash(msg1)
  tangle.add(msgHash1, msg1)

  const unknownMsg = FeedV1.create({
    keys,
    content: { text: 'Alien' },
    type: 'post',
    tangles: {
      [rootHash]: tangle,
    },
    when: 1652030001000,
  })
  const unknownMsgHash = FeedV1.getMsgHash(unknownMsg)

  const tangle2 = new FeedV1.Tangle(rootHash)
  tangle2.add(rootHash, rootMsg)
  tangle2.add(unknownMsgHash, unknownMsg)

  const msg2 = FeedV1.create({
    keys,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: tangle2
    },
    when: 1652030002000,
  })
  const msgHash2 = FeedV1.getMsgHash(msg2)

  FeedV1.validate(msg2, tangle, msgHash2, rootHash, (err) => {
    t.ok(err, 'invalid 2nd msg throws')
    t.match(
      err.message,
      /prev .+ is not locally known/,
      'invalid 2nd msg description'
    )
    t.end()
  })
})

tape('invalid feed msg with a different who', (t) => {
  const keysA = generateKeypair('alice')
  const keysB = generateKeypair('bob')

  const rootMsg = FeedV1.createRoot(keysA, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)
  const feedTangle = new FeedV1.Tangle(rootHash)
  feedTangle.add(rootHash, rootMsg)

  const msg = FeedV1.create({
    keys: keysB,
    content: { text: 'Hello world!' },
    type: 'post',
    tangles: {
      [rootHash]: feedTangle,
    },
    when: 1652030002000,
  })
  const msgHash = FeedV1.getMsgHash(msg)

  FeedV1.validate(msg, feedTangle, msgHash, rootHash, (err) => {
    t.match(err.message, /who ".*" does not match feed who/, 'invalid feed msg')
    t.end()
  })
})

tape('invalid feed msg with a different type', (t) => {
  const keysA = generateKeypair('alice')

  const rootMsg = FeedV1.createRoot(keysA, 'post')
  const rootHash = FeedV1.getMsgHash(rootMsg)
  const feedTangle = new FeedV1.Tangle(rootHash)
  feedTangle.add(rootHash, rootMsg)

  const msg = FeedV1.create({
    keys: keysA,
    content: { text: 'Hello world!' },
    type: 'comment',
    tangles: {
      [rootHash]: feedTangle,
    },
    when: 1652030002000,
  })
  const msgHash = FeedV1.getMsgHash(msg)

  FeedV1.validate(msg, feedTangle, msgHash, rootHash, (err) => {
    t.match(
      err.message,
      /type "comment" does not match feed type "post"/,
      'invalid feed msg'
    )
    t.end()
  })
})
