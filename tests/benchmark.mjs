import assert from 'node:assert/strict';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import nodePath from 'node:path';
import { posix, win32 } from '../dist/espath-core.esm.mjs';

var longPosix = '/root';
var longWin = 'C:\\root';
var longUnc = '\\\\server\\share\\root';
var i = 0;
for (i = 0; i < 120; i++) {
  longPosix += '/segment-' + i;
  longWin += '\\segment-' + i;
  longUnc += '\\segment-' + i;
}

var uriInput = longWin + '\\Résumé #1\\100%.ai';
var uri = win32.toFileURL(uriInput);
var lanes = [
  { name: 'posix.normalize-short', ours: function () { posix.normalize('/home/artist//jobs/../exports/file.ai'); }, base: function () { nodePath.posix.normalize('/home/artist//jobs/../exports/file.ai'); }, loops: 12000 },
  { name: 'win32.normalize-short', ours: function () { win32.normalize('C:/Users/Artist\\jobs\\..\\exports\\file.ai'); }, base: function () { nodePath.win32.normalize('C:/Users/Artist\\jobs\\..\\exports\\file.ai'); }, loops: 12000 },
  { name: 'win32.resolve-explicit-cwd', ours: function () { win32.resolve('C:\\Users\\Artist\\project', 'art\\..\\exports\\file.ai'); }, base: function () { nodePath.win32.resolve('C:\\Users\\Artist\\project', 'art\\..\\exports\\file.ai'); }, loops: 10000 },
  { name: 'win32.relative-UNC-long', ours: function () { win32.relative(longUnc + '\\src', longUnc + '\\out\\asset.ai'); }, base: function () { nodePath.win32.relative(longUnc + '\\src', longUnc + '\\out\\asset.ai'); }, loops: 2500 },
  { name: 'file-uri-roundtrip-long-unicode', ours: function () { win32.fromFileURL(win32.toFileURL(uriInput)); }, base: null, loops: 1500 },
  { name: 'file-uri-decode-long', ours: function () { win32.fromFileURL(uri); }, base: null, loops: 3000 },
  { name: 'posix.normalize-long-2400-plus-chars', ours: function () { posix.normalize(longPosix + '/../tail'); }, base: function () { nodePath.posix.normalize(longPosix + '/../tail'); }, loops: 1000 }
];

function median(values) {
  var sorted = values.slice();
  sorted.sort(function (a, b) { return a - b; });
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(fn, loops) {
  return measureStats(fn, loops, 2, 7).medianUs;
}

function measureStats(fn, loops, warmups, sampleCount) {
  var samples = [];
  var i = 0;
  var j = 0;
  var start = 0;
  var sorted = [];
  for (i = 0; i < warmups; i++) {
    for (j = 0; j < loops; j++) { fn(); }
  }
  for (i = 0; i < sampleCount; i++) {
    start = performance.now();
    for (j = 0; j < loops; j++) { fn(); }
    samples[samples.length] = (performance.now() - start) * 1000 / loops;
  }
  sorted = samples.slice();
  sorted.sort(function (a, b) { return a - b; });
  return {
    medianUs: median(samples),
    minUs: sorted[0],
    maxUs: sorted[sorted.length - 1],
    warmups: warmups,
    samples: sampleCount,
    loopsPerSample: loops
  };
}

function appendSegments(root, separator, count, segment) {
  var path = root;
  var i = 0;
  for (i = 0; i < count; i++) {
    if (path.length > 0 && path.charCodeAt(path.length - 1) !== 47 && path.charCodeAt(path.length - 1) !== 92) {
      path += separator;
    }
    path += segment;
  }
  return path;
}

function cancellationFixture(api, targetSize) {
  var root = api.kind === 'win32' ? 'C:\\' : '/';
  var separator = api.sep;
  var count = Math.floor((targetSize - root.length) / 5);
  var input = root;
  var i = 0;
  for (i = 0; i < count; i++) { input += 's' + separator; }
  for (i = 0; i < count; i++) { input += '..' + separator; }
  return { input: input, expected: root, segments: count };
}

function deepNoDotFixture(api, targetSize) {
  var windows = api.kind === 'win32';
  var root = windows ? 'C:\\' : '/';
  var separatorRun = windows ? '/\\' : '//';
  var count = Math.max(1, Math.floor((targetSize - root.length + 2) / 3));
  var input = root + 's';
  var i = 1;
  for (i = 1; i < count; i++) { input += separatorRun + 's'; }
  return { input: input, expected: appendSegments(root, api.sep, count, 's'), segments: count };
}

function identityFixture(api, targetSize) {
  var root = api.kind === 'win32' ? 'C:\\' : '/';
  var count = Math.max(1, Math.floor((targetSize - root.length + 1) / 2));
  var input = appendSegments(root, api.sep, count, 's');
  return { input: input, expected: input, segments: count };
}

function separatorHeavyFixture(api, targetSize) {
  var root = api.kind === 'win32' ? 'C:\\' : '/';
  var count = Math.max(1, Math.floor((targetSize - root.length) / 9));
  var input = root;
  var i = 0;
  for (i = 0; i < count; i++) { input += '////////s'; }
  return { input: input, expected: appendSegments(root, api.sep, count, 's'), segments: count };
}

function uriFixture(api, targetSize) {
  var root = api.kind === 'win32' ? 'C:\\' : '/';
  var segment = 'Résumé #100%😀';
  var count = Math.max(1, Math.floor((targetSize - root.length + 1) / (segment.length + 1)));
  var input = appendSegments(root, api.sep, count, segment);
  return { input: input, expected: input, segments: count };
}

function addAdversarialCase(output, stage, lane, api, targetSize, input, expected, loops, fn, extra) {
  var timing = null;
  var observed = fn();
  assert.equal(observed, expected, stage + '/' + lane + '/' + targetSize + ' output parity');
  timing = measureStats(fn, loops, 1, 5);
  output[output.length] = {
    stage: stage,
    lane: lane,
    dialect: api.kind,
    targetInputChars: targetSize,
    inputChars: input.length,
    outputChars: observed.length,
    medianUs: timing.medianUs,
    minUs: timing.minUs,
    maxUs: timing.maxUs,
    warmups: timing.warmups,
    samples: timing.samples,
    loopsPerSample: timing.loopsPerSample,
    details: extra
  };
}

var adversarial = [];
var sizes = [1024, 16384, 65536];
var apis = [
  { api: posix, reference: nodePath.posix },
  { api: win32, reference: nodePath.win32 }
];
var sizeIndex = 0;
var apiIndex = 0;
var fixture = null;
var loops = 0;
var uriInputValue = '';
var uriValue = '';

for (sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
  for (apiIndex = 0; apiIndex < apis.length; apiIndex++) {
    var current = apis[apiIndex].api;
    var nodeCurrent = apis[apiIndex].reference;
    var targetSize = sizes[sizeIndex];

    fixture = cancellationFixture(current, targetSize);
    assert.equal(fixture.expected, nodeCurrent.normalize(fixture.input), 'cancellation Node oracle');
    loops = Math.max(1, Math.floor(65536 / fixture.input.length));
    addAdversarialCase(adversarial, 'lexical-normalize', 'stack-cancellation-lastIndexOf-slice', current,
      targetSize, fixture.input, fixture.expected, loops,
      function (api, path) { return function () { return api.normalize(path); }; }(current, fixture.input),
      { canceledSegments: fixture.segments, algorithmUnderTest: 'normalizeTail output.lastIndexOf + output.slice' });

    fixture = deepNoDotFixture(current, targetSize);
    assert.equal(fixture.expected, nodeCurrent.normalize(fixture.input), 'deep no-dot Node oracle');
    loops = Math.max(1, Math.floor(250000 / fixture.input.length));
    addAdversarialCase(adversarial, 'lexical-normalize', 'deep-no-dot-slow-path', current,
      targetSize, fixture.input, fixture.expected, loops,
      function (api, path) { return function () { return api.normalize(path); }; }(current, fixture.input),
      { segments: fixture.segments, reason: 'duplicate separator forces scan and segment assembly' });

    fixture = identityFixture(current, targetSize);
    assert.equal(fixture.expected, nodeCurrent.normalize(fixture.input), 'identity Node oracle');
    loops = Math.max(1, Math.floor(250000 / fixture.input.length));
    addAdversarialCase(adversarial, 'lexical-normalize', 'already-normalized-identity', current,
      targetSize, fixture.input, fixture.expected, loops,
      function (api, path) { return function () { return api.normalize(path); }; }(current, fixture.input),
      { segments: fixture.segments, expectedFastPath: true });

    fixture = separatorHeavyFixture(current, targetSize);
    assert.equal(fixture.expected, nodeCurrent.normalize(fixture.input), 'separator-heavy Node oracle');
    loops = Math.max(1, Math.floor(250000 / fixture.input.length));
    addAdversarialCase(adversarial, 'lexical-normalize', 'separator-heavy', current,
      targetSize, fixture.input, fixture.expected, loops,
      function (api, path) { return function () { return api.normalize(path); }; }(current, fixture.input),
      { segments: fixture.segments, separatorRunChars: 8 });

    fixture = uriFixture(current, targetSize);
    uriInputValue = fixture.input;
    uriValue = current.toFileURL(uriInputValue);
    assert.equal(current.normalize(fixture.expected), current.fromFileURL(uriValue), 'URI round-trip parity');
    loops = Math.max(1, Math.floor(250000 / uriInputValue.length));
    addAdversarialCase(adversarial, 'file-uri-encode', 'toFileURL-normalize-plus-UTF8-percent-encode', current,
      targetSize, uriInputValue, uriValue, loops,
      function (api, path) { return function () { return api.toFileURL(path); }; }(current, uriInputValue),
      { segments: fixture.segments, note: 'includes API lexical normalization; lexical-only lanes are reported separately' });
    loops = Math.max(1, Math.floor(250000 / uriValue.length));
    addAdversarialCase(adversarial, 'file-uri-decode', 'fromFileURL-UTF8-percent-decode-plus-normalize', current,
      targetSize, uriValue, fixture.expected, loops,
      function (api, uri) { return function () { return api.fromFileURL(uri); }; }(current, uriValue),
      { segments: fixture.segments, uriChars: uriValue.length, note: 'includes URI parsing and final lexical normalization' });
  }
}

console.log(JSON.stringify({
  runtime: process.version,
  platform: process.platform,
  arch: process.arch,
  cpu: os.cpus()[0] ? os.cpus()[0].model : 'unknown',
  method: '2 warmups, 7 samples, median microseconds/op; values are workload-specific, not a portable performance claim',
  pathLengths: { posix: longPosix.length, win32: longWin.length, unc: longUnc.length, uri: uri.length },
  adversarialMethod: '1 warmup, 5 samples, median/min/max microseconds/op; loops amortize clock granularity; lexical normalize and file-URI API lanes are separate',
  adversarial: adversarial,
  results: lanes.map(function (lane) {
    var ours = measure(lane.ours, lane.loops);
    var base = lane.base ? measure(lane.base, lane.loops) : null;
    return { lane: lane.name, loops: lane.loops, oursMedianUs: ours, nodePathMedianUs: base,
      oursOverNode: base === null ? null : ours / base };
  })
}, null, 2));
