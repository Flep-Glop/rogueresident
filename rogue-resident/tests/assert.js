// tests/assert.js
function assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }
  
  function assertEqual(actual, expected, message) {
    assert(
      actual === expected, 
      message || `Expected ${expected} but got ${actual}`
    );
  }
  
  function assertIncludes(array, item, message) {
    assert(
      array.includes(item),
      message || `Expected array to include ${item}`
    );
  }
  
  module.exports = { assert, assertEqual, assertIncludes };