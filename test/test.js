const rfc6902 = require('../dist/index.js')
const assert = require('assert')

/**
 * These tests come from https://github.com/json-patch/json-patch-tests and have quite a good
 * coverage. The "error" parameter is only used as a indicator that the test should throw.
 */
const specTests = require('./spec_tests.json')
const tests = require('./tests.json')

for (const test of specTests) {
  if (test.disabled) {
    continue
  }

  console.log('Started: ' + test.comment)
  if (test.error) {
    assert.throws(() => rfc6902.apply(test.doc, test.patch))
  } else {
    assert.deepStrictEqual(rfc6902.apply(test.doc, test.patch), test.expected)
  }
  console.log('Success: ' + test.comment)
}

console.log('\n\nFINSIHED TESTS FROM SPEC!\n\n')

for (const test of tests) {
  if (test.disabled) {
    continue
  }

  console.log('Started: ' + test.comment)
  if (test.error) {
    assert.throws(() => rfc6902.apply(test.doc, test.patch))
  } else {
    assert.deepStrictEqual(rfc6902.apply(test.doc, test.patch), test.expected)
  }
  console.log('Success: ' + test.comment)
}

console.log('\n\nFINSIHED ALL TESTS!\n\n')
