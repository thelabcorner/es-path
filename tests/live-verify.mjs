#!/usr/bin/env node
// Live behavioral + File-semantics verification through COMTool V2 only.
// No File.exists/open/read/write operation is used by the Illustrator probe.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

var ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
var BUNDLE = join(ROOT, 'dist', 'ESPATH.jsx');
var SDK = join(ROOT, '..', 'comtool-v2', 'sdk', 'node', 'index.mjs');
var ESTC_COMPAT = join(ROOT, '..', 'extendscript-toolchain', 'src', 'comtool.mjs');
if (!existsSync(BUNDLE)) { throw new Error('build first: ' + BUNDLE); }
if (!existsSync(SDK)) { throw new Error('COMTool V2 Node SDK is not available at ' + SDK); }
if (!existsSync(ESTC_COMPAT)) { throw new Error('ESTC COMTool compatibility helper is not available at ' + ESTC_COMPAT); }

var sdk = await import(pathToFileURL(SDK).href);
var estcCompat = await import(pathToFileURL(ESTC_COMPAT).href);
var runtime = await sdk.ComToolLocalRuntime.start({ host: 'illustrator' });
var session = null;
try {
  session = await runtime.openSession({
    host: 'illustrator',
    launch: false,
    lease: true,
    leaseTtlMs: 600000,
    leaseWaitMs: 60000,
    requiredCapabilities: ['script.eval']
  });

  var bundle = readFileSync(BUNDLE, 'utf8');
  var code = '(function () {\n' + bundle + '\n' + [
    'try { delete $.global.ESPATH; } catch (e1) { $.global.ESPATH = undefined; }',
    '$.evalFile(new File(' + JSON.stringify(BUNDLE.replace(/\\/g, '/')) + '));',
    'var espathApi = $.global.ESPATH;',
    'var espathChecks = [];',
    'function espathRecord(name, got, expected) { espathChecks[espathChecks.length] = { name: name, pass: got === expected, got: got, expected: expected }; }',
    'espathRecord("posix.normalize", espathApi.posix.normalize("/a//b/../c/"), "/a/c/");',
    'espathRecord("win32.normalize", espathApi.win32.normalize("C:/a\\\\b/../c"), "C:\\\\a\\\\c");',
    'espathRecord("posix.join arguments", espathApi.posix.join("/a", "b", "..", "c"), "/a/c");',
    'espathRecord("win32.join arguments", espathApi.win32.join("C:/a", "b", "..", "c"), "C:\\\\a\\\\c");',
    'espathRecord("win32 UNC", espathApi.win32.normalize("\\\\\\\\server\\\\share\\\\a\\\\..\\\\b"), "\\\\\\\\server\\\\share\\\\b");',
    'espathRecord("resolve explicit cwd", espathApi.win32.resolve("C:\\\\work\\\\app", "src", "..", "out"), "C:\\\\work\\\\app\\\\out");',
    'espathRecord("file URI UTF-8", espathApi.win32.toFileURL("C:\\\\Users\\\\Ada Lovelace\\\\Résumé #1\\\\100%.ai"), "file:///C:/Users/Ada%20Lovelace/R%C3%A9sum%C3%A9%20%231/100%25.ai");',
    'espathRecord("file URI roundtrip", espathApi.win32.fromFileURL("file:///C:/Users/Ada%20Lovelace/R%C3%A9sum%C3%A9%20%231/100%25.ai"), "C:\\\\Users\\\\Ada Lovelace\\\\Résumé #1\\\\100%.ai");',
    'var espathFileInput = "C:/ESPATH Probe/Résumé 100%/child.txt";',
    'var espathFile = new File(espathFileInput);',
    'var espathFileEvidence = { input: espathFileInput, fsName: String(espathFile.fsName), fullName: String(espathFile.fullName), absoluteURI: String(espathFile.absoluteURI), stringValue: String(espathFile), encode: File.encode("Résumé 100%"), decode: File.decode("R%C3%A9sum%C3%A9%20100%25") };',
    'var espathReloadFirst = espathApi;',
    '$.evalFile(new File(' + JSON.stringify(BUNDLE.replace(/\\/g, '/')) + '));',
    'var espathReloadReplaced = $.global.ESPATH !== espathReloadFirst;',
    'var espathReloadApi = $.global.ESPATH;',
    'espathRecord("same-version reload replacement", espathReloadReplaced, true);',
    'espathRecord("post-reload normalize", espathReloadApi.posix.normalize("/reload//../ok"), "/ok");',
    'var espathBench = [];',
    'function espathMedian(a) { a.sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }',
    'function espathTime(name, fn, loops) { var samples = []; var i; var j; var d; var medianUs; for (i = 0; i < 2; i++) { for (j = 0; j < loops; j++) { fn(); } } for (i = 0; i < 7; i++) { $.hiresTimer; for (j = 0; j < loops; j++) { fn(); } d = $.hiresTimer; if (d > 0 && d < 10000000) { samples[samples.length] = d / loops; } } if (samples.length === 0) { throw new Error("no valid timer samples for " + name); } medianUs = espathMedian(samples); espathBench[espathBench.length] = { lane: name, loops: loops, medianUs: medianUs, minUs: samples[0], maxUs: samples[samples.length - 1], samples: samples.length }; return medianUs; }',
    'var espathLongPosix = "/root"; var espathLongWin = "C:\\\\root"; var espathLongUnc = "\\\\\\\\server\\\\share\\\\root"; var espathI;',
    'for (espathI = 0; espathI < 100; espathI++) { espathLongPosix += "/segment-" + espathI; espathLongWin += "\\\\segment-" + espathI; espathLongUnc += "\\\\segment-" + espathI; }',
    'var espathLongFilePath = espathLongWin + "\\\\Résumé #1\\\\100%.ai";',
    'var espathLongFileUri = espathApi.win32.toFileURL(espathLongFilePath);',
    'espathTime("posix.normalize-short", function () { espathApi.posix.normalize("/home/artist//jobs/../exports/file.ai"); }, 300);',
    'espathTime("win32.normalize-short", function () { espathApi.win32.normalize("C:/Users/Artist\\\\jobs\\\\..\\\\exports\\\\file.ai"); }, 300);',
    'espathTime("win32.normalize-UNC-long", function () { espathApi.win32.normalize(espathLongUnc + "\\\\..\\\\tail"); }, 30);',
    'espathTime("posix.normalize-long", function () { espathApi.posix.normalize(espathLongPosix + "/../tail"); }, 30);',
    'espathTime("file-uri-encode-long-Unicode", function () { espathApi.win32.toFileURL(espathLongFilePath); }, 20);',
    'espathTime("file-uri-decode-long-Unicode", function () { espathApi.win32.fromFileURL(espathLongFileUri); }, 20);',
    'var espathLiveReport = { host: app.name + " " + app.version, engine: $.version, checks: espathChecks, file: espathFileEvidence, reloadReplaced: espathReloadReplaced, benchmark: espathBench, pathLengths: { posix: espathLongPosix.length, win32: espathLongWin.length, unc: espathLongUnc.length, filePath: espathLongFilePath.length, fileUri: espathLongFileUri.length } };',
    'return espathLiveReport;'
  ].join('\n') + '\n})()';

  var run = await estcCompat.runEvalWithResultModeCompatibility({
    sdk: sdk,
    runtime: runtime,
    session: session,
    kind: 'expression',
    source: code,
    effects: 'unknown',
    watchdogMs: 180000
  });
  if (run.exitCode !== 0 || !run.value) {
    throw new Error('COMTool V2 live test failed: ' + JSON.stringify(run));
  }

  var report = run.value;
  for (var i = 0; i < report.checks.length; i++) {
    assert.equal(report.checks[i].pass, true, report.checks[i].name + ': ' + JSON.stringify(report.checks[i]));
  }
  assert.equal(typeof report.file.fsName, 'string');
  assert.equal(typeof report.file.fullName, 'string');
  assert.equal(typeof report.file.absoluteURI, 'string');
  assert.equal(typeof report.file.encode, 'string');
  assert.equal(typeof report.file.decode, 'string');
  assert.equal(report.reloadReplaced, true);

  console.log(JSON.stringify({
    verdict: 'pass',
    method: 'COMTool V2 ComToolLocalRuntime + target-bound script.eval test',
    host: report.host,
    engine: report.engine,
    pathAndUriChecks: report.checks.length,
    adobeFile: report.file,
    reloadReplaced: report.reloadReplaced,
    liveMedianUs: report.benchmark,
    pathLengths: report.pathLengths,
    filesystemOperations: 'none (no exists/open/read/write/copy/move/delete calls)'
  }, null, 2));
} finally {
  if (session && session.leaseId) {
    try { await session.releaseLease(); } catch (ignore) {}
  }
  await runtime.close();
}
