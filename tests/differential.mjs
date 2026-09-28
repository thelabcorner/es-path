import assert from 'node:assert/strict';
import nodePath from 'node:path';
import { posix, win32 } from '../dist/espath-core.esm.mjs';

var seed = 1337;
var checks = 0;

function random(limit) {
  seed = (seed * 48271) % 2147483647;
  return seed % limit;
}

function same(actual, expected, label) {
  checks++;
  assert.equal(actual, expected, label);
}

function randomPath(apiName, absolute) {
  var api = apiName === 'win32' ? win32 : posix;
  var candidates = ['alpha', 'beta', '.', '..', 'three.dots', 'space here', 'é', 'a%20b', ''];
  var separator = api.sep;
  var count = 1 + random(7);
  var path = '';
  var i = 0;
  var segment = '';

  if (absolute) {
    if (apiName === 'win32') {
      path = random(2) === 0 ? 'C:\\' : '\\\\server\\share\\';
    } else {
      path = '/';
    }
  } else if (apiName === 'win32' && random(5) === 0) {
    path = random(2) === 0 ? '.\\' : '..\\';
  }

  for (i = 0; i < count; i++) {
    segment = candidates[random(candidates.length)];
    if (path.length > 0 && path.charCodeAt(path.length - 1) !== 47 && path.charCodeAt(path.length - 1) !== 92) {
      path += separator;
    }
    path += segment;
    if (random(12) === 0) { path += separator; }
  }
  return path;
}

function lexicalCwd(apiName) {
  var cwd = apiName === 'win32' ? 'C:\\__espath_cwd__' : '/__espath_cwd__';
  var i = 0;
  for (i = 0; i < 16; i++) {
    cwd += apiName === 'win32' ? '\\d' + i : '/d' + i;
  }
  return cwd;
}

function leadingParentDepth(path, separator) {
  var count = 0;
  var start = 0;
  var end = 0;
  while (start < path.length) {
    end = start;
    while (end < path.length && path.charCodeAt(end) !== separator.charCodeAt(0)) { end++; }
    if (end - start !== 2 || path.charCodeAt(start) !== 46 || path.charCodeAt(start + 1) !== 46) { break; }
    count++;
    start = end;
    while (start < path.length && path.charCodeAt(start) === separator.charCodeAt(0)) { start++; }
  }
  return count;
}

var i = 0;
var api = null;
var nodeApi = null;
var candidate = '';
var cwd = '';
var normalizedLeft = '';
var normalizedRight = '';
var leftParentDepth = 0;
var rightParentDepth = 0;
var left = '';
var right = '';
var parts = [];
var relativeOracleSkips = 0;

for (i = 0; i < 6000; i++) {
  api = i % 2 === 0 ? posix : win32;
  nodeApi = i % 2 === 0 ? nodePath.posix : nodePath.win32;
  candidate = randomPath(i % 2 === 0 ? 'posix' : 'win32', random(2) === 0);
  same(api.normalize(candidate), nodeApi.normalize(candidate), 'normalize ' + JSON.stringify(candidate));
  same(api.isAbsolute(candidate), nodeApi.isAbsolute(candidate), 'isAbsolute ' + JSON.stringify(candidate));
  same(api.dirname(candidate), nodeApi.dirname(candidate), 'dirname ' + JSON.stringify(candidate));
  same(api.basename(candidate), nodeApi.basename(candidate), 'basename ' + JSON.stringify(candidate));
  same(api.extname(candidate), nodeApi.extname(candidate), 'extname ' + JSON.stringify(candidate));
  parts = [randomPath(i % 2 === 0 ? 'posix' : 'win32', random(2) === 0),
    randomPath(i % 2 === 0 ? 'posix' : 'win32', false),
    randomPath(i % 2 === 0 ? 'posix' : 'win32', false)];
  same(api.join.apply(null, parts), nodeApi.join.apply(null, parts), 'join ' + JSON.stringify(parts));
}

for (i = 0; i < 1500; i++) {
  api = i % 2 === 0 ? posix : win32;
  nodeApi = i % 2 === 0 ? nodePath.posix : nodePath.win32;
  if (i % 2 === 0) {
    cwd = '/base/root';
  } else {
    cwd = 'C:\\base\\root';
  }
  parts = [randomPath(i % 2 === 0 ? 'posix' : 'win32', random(2) === 0),
    randomPath(i % 2 === 0 ? 'posix' : 'win32', false)];
  same(api.resolve.apply(null, [cwd].concat(parts)), nodeApi.resolve.apply(null, [cwd].concat(parts)),
    'resolve ' + JSON.stringify([cwd].concat(parts)));
}

for (i = 0; i < 1500; i++) {
  api = i % 2 === 0 ? posix : win32;
  nodeApi = i % 2 === 0 ? nodePath.posix : nodePath.win32;
  if (i % 2 === 0) {
    left = randomPath('posix', random(2) === 0);
    right = randomPath('posix', left.charCodeAt(0) === 47);
  } else {
    left = randomPath('win32', random(2) === 0);
    if (left.slice(0, 2) === '\\\\') {
      right = randomPath('win32', true);
      right = right.replace('server', 'server');
      if (right.slice(0, 2) !== '\\\\') { right = '\\\\server\\share\\' + right; }
    } else if (left.length > 2 && left.charCodeAt(1) === 58) {
      right = 'C:\\' + randomPath('win32', false);
    } else {
      right = randomPath('win32', false);
    }
  }

  try {
    if (!api.isAbsolute(left) && !api.isAbsolute(right)) {
      normalizedLeft = api.normalize(left);
      normalizedRight = api.normalize(right);
      leftParentDepth = leadingParentDepth(normalizedLeft, api.sep);
      rightParentDepth = leadingParentDepth(normalizedRight, api.sep);
      if (leftParentDepth !== rightParentDepth) {
        assert.throws(() => api.relative(left, right), /explicit cwd/,
          'ambiguous relative parent depth ' + JSON.stringify([left, right]));
        relativeOracleSkips++;
        continue;
      }
      cwd = lexicalCwd(i % 2 === 0 ? 'posix' : 'win32');
      same(api.relative(left, right),
        nodeApi.relative(nodeApi.resolve(cwd, left), nodeApi.resolve(cwd, right)),
        'relative lexical ' + JSON.stringify([left, right]));
    } else {
      same(api.relative(left, right), nodeApi.relative(left, right),
      'relative ' + JSON.stringify([left, right]));
    }
  } catch (error) {
    if (error && error.code === 'ERR_ASSERTION') { throw error; }
    if (i % 2 === 0 && ((left.charCodeAt(0) === 47) !== (right.charCodeAt(0) === 47))) { continue; }
    if (i % 2 !== 0 && ((api.isAbsolute(left) !== api.isAbsolute(right)) ||
      (api.isAbsolute(left) && api.isAbsolute(right) && left.slice(0, 2).toLowerCase() !== right.slice(0, 2).toLowerCase()))) {
      continue;
    }
    throw error;
  }
}

console.log('differential: ' + checks + ' assertions vs node:path.posix/win32, seed 1337, 0 divergences; mismatched relative parent depths rejected: ' + relativeOracleSkips);
