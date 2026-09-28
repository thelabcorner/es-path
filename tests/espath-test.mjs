import assert from 'node:assert/strict';
import { ESPATH, posix, win32 } from '../dist/espath-core.esm.mjs';

assert.equal(ESPATH.posix, posix);
assert.equal(ESPATH.win32, win32);
assert.equal(posix.sep, '/');
assert.equal(posix.delimiter, ':');
assert.equal(win32.sep, '\\');
assert.equal(win32.delimiter, ';');

const posixNormalize = [
  ['', '.'], ['.', '.'], ['..', '..'], ['a/./b', 'a/b'],
  ['a/b/../c/', 'a/c/'], ['/a//b/../../c', '/c'],
  ['/../../a', '/a'], ['a/../../b', '../b'], ['///a//b', '/a/b'],
  ['/a/..', '/'], ['a/..', '.'], ['a/../', './'], ['/x/./y/../z/', '/x/z/']
];
for (const [input, expected] of posixNormalize) {
  assert.equal(posix.normalize(input), expected, 'posix.normalize(' + JSON.stringify(input) + ')');
}

const winNormalize = [
  ['', '.'], ['.', '.'], ['a\\.\\b', 'a\\b'],
  ['C:\\temp\\\\foo\\bar\\..\\', 'C:\\temp\\foo\\'],
  ['C:/temp\\/foo/bar', 'C:\\temp\\foo\\bar'],
  ['C:foo\\..\\bar', 'C:bar'], ['C:', 'C:.'],
  ['C:\\foo', 'C:\\foo'], ['C:\\\\foo', 'C:\\foo'],
  ['C:////foo', 'C:\\foo'], ['C:/\\\\foo', 'C:\\foo'],
  ['\\foo\\..\\bar', '\\bar'], ['C:\\..\\a', 'C:\\a'],
  ['\\foo/\\\\foo', '\\foo\\foo'],
  ['\\\\server', '\\server'],
  ['\\\\server\\share\\a\\..\\b', '\\\\server\\share\\b'],
  ['\\\\server\\share\\a', '\\\\server\\share\\a'],
  ['\\\\server\\share\\\\a', '\\\\server\\share\\a'],
  ['\\\\server\\share\\\\\\a', '\\\\server\\share\\a'],
  ['\\\\server\\share/\\a', '\\\\server\\share\\a'],
  ['\\\\server\\share', '\\\\server\\share\\'],
  ['\\\\server\\share\\', '\\\\server\\share\\'],
  ['\\\\server\\share\\\\', '\\\\server\\share\\'],
  ['\\\\server\\share\\\\\\', '\\\\server\\share\\']
];
for (const [input, expected] of winNormalize) {
  assert.equal(win32.normalize(input), expected, 'win32.normalize(' + JSON.stringify(input) + ')');
}

assert.equal(posix.join('/a', 'b', '../c'), '/a/c');
assert.equal(posix.join(), '.');
assert.equal(win32.join('C:/a', 'b', '..', 'c'), 'C:\\a\\c');
assert.equal(win32.join('\\', 'é\\beta\\..\\space here', 'space here\\beta\\..'),
  '\\é\\space here\\space here');
assert.equal(posix.isAbsolute('/a/../b'), true);
assert.equal(posix.isAbsolute('a/b'), false);
assert.equal(win32.isAbsolute('C:/a'), true);
assert.equal(win32.isAbsolute('\\rooted'), true);
assert.equal(win32.isAbsolute('C:relative'), false);

assert.equal(posix.dirname('/a/b/'), '/a');
assert.equal(posix.dirname('/a'), '/');
assert.equal(posix.dirname('//space here/'), '//');
assert.equal(posix.dirname('//a/'), '//');
assert.equal(posix.dirname('//a/b'), '//a');
assert.equal(posix.dirname('///a/'), '//');
assert.equal(posix.dirname('///a/b'), '///a');
assert.equal(posix.dirname('////a/b'), '////a');
assert.equal(posix.dirname('//'), '/');
assert.equal(posix.dirname('///'), '/');
assert.equal(posix.dirname('////'), '/');
assert.equal(posix.dirname('//a'), '//');
assert.equal(posix.dirname('///a'), '//');
assert.equal(posix.dirname('a'), '.');
assert.equal(win32.dirname('C:\\a\\b\\'), 'C:\\a');
assert.equal(win32.dirname('C:\\a'), 'C:\\');
assert.equal(win32.dirname('C:\\a\\\\b'), 'C:\\a\\');
assert.equal(posix.basename('/a/b/'), 'b');
assert.equal(posix.basename('/a/file.tar.gz', '.gz'), 'file.tar');
assert.equal(posix.basename('.config'), '.config');
assert.equal(posix.extname('.config'), '');
assert.equal(posix.extname('archive.tar.gz'), '.gz');
assert.equal(posix.extname('name.'), '.');
assert.equal(win32.basename('C:\\a\\file.txt'), 'file.txt');
assert.equal(win32.basename('C:\\'), '');
assert.equal(win32.basename('C:'), '');
assert.equal(win32.basename('\\\\server\\share'), 'share');
assert.equal(posix.normalize('/nul/\u0000segment'), '/nul/\u0000segment');
assert.equal(win32.normalize('C:\\nul\\\u0000segment'), 'C:\\nul\\\u0000segment');

assert.equal(posix.resolve('/work/app', 'src', '..', 'out'), '/work/app/out');
assert.equal(posix.resolve('/work/app', '/tmp', 'x'), '/tmp/x');
assert.equal(posix.resolve('/work/app', 'src/'), '/work/app/src');
assert.equal(win32.resolve('C:\\work\\app', 'src', '..', 'out'), 'C:\\work\\app\\out');
assert.equal(win32.resolve('C:\\work\\app', 'C:\\base', 'D:\\later', 'leaf'), 'D:\\later\\leaf');
assert.equal(win32.resolve('C:\\work\\app', '\\rooted', 'x'), 'C:\\rooted\\x');
assert.equal(win32.resolve('C:\\work\\app', '\\\\server\\share\\base', '\\rooted'),
  '\\\\server\\share\\rooted');
assert.equal(win32.resolve('C:\\work\\app', 'C:relative'), 'C:\\work\\app\\relative');
assert.equal(win32.resolve('C:\\work\\app', 'src\\'), 'C:\\work\\app\\src');
assert.equal(win32.resolve('C:\\work\\app', '\\'), 'C:\\');
assert.throws(() => win32.resolve('C:\\work', 'D:relative'), TypeError);
assert.throws(() => posix.resolve('relative-cwd', 'x'), TypeError);

assert.equal(posix.relative('/data/test/a', '/data/impl/b'), '../../impl/b');
assert.equal(posix.relative('a/b', 'a/c'), '../c');
assert.equal(posix.relative('/a/b', '/a/b'), '');
assert.equal(posix.relative('../from', '../to/leaf'), '../to/leaf');
assert.throws(() => posix.relative('../a', '../../b'), /explicit cwd/);
assert.equal(win32.relative('C:\\a\\b', 'c:\\a\\c'), '..\\c');
assert.equal(win32.relative('..\\from', '..\\to\\leaf'), '..\\to\\leaf');
assert.throws(() => win32.relative('..\\a', '..\\..\\b'), /explicit cwd/);
assert.equal(win32.relative('C:\\a', 'D:\\b'), 'D:\\b');
assert.throws(() => win32.relative('C:foo', 'C:bar'), TypeError);

const uriCases = [
  [posix, '/', 'file:///'],
  [posix, '/tmp/a b/#x%y', 'file:///tmp/a%20b/%23x%25y'],
  [posix, '/tmp/Résumé/😀.ai', 'file:///tmp/R%C3%A9sum%C3%A9/%F0%9F%98%80.ai'],
  [win32, 'C:\\', 'file:///C:/'],
  [win32, 'C:\\Users\\Ada Lovelace\\Résumé #1\\100%.ai', 'file:///C:/Users/Ada%20Lovelace/R%C3%A9sum%C3%A9%20%231/100%25.ai'],
  [win32, '\\\\server\\Share name\\folder\\file.txt', 'file://server/Share%20name/folder/file.txt']
];
for (const [api, path, expected] of uriCases) {
  assert.equal(api.toFileURL(path), expected);
  assert.equal(api.normalize(api.fromFileURL(expected)), api.normalize(path));
}
assert.equal(win32.toFileURL('\\\\server\\Share'), 'file://server/Share/');
assert.equal(win32.fromFileURL('file://server/Share/'), '\\\\server\\Share\\');
assert.equal(win32.fromFileURL(win32.toFileURL('\\\\server\\share\\folder\\..\\file.txt')),
  '\\\\server\\share\\file.txt');
assert.equal(posix.fromFileURL('FILE:/tmp/a%20b'), '/tmp/a b');
assert.equal(win32.fromFileURL('file://localhost/C:/tmp/a%20b'), 'C:\\tmp\\a b');
assert.equal(win32.fromFileURL('file://server/share/a%20b'), '\\\\server\\share\\a b');

for (const bad of [
  'http://example/a', 'file:relative', 'file:///tmp/a?query', 'file:///tmp/a#frag',
  'file:///tmp/%', 'file:///tmp/%2Fsegment', 'file:///tmp/%C0%AF', 'file:///tmp/%00'
]) {
  assert.throws(() => posix.fromFileURL(bad), TypeError, bad);
}
assert.throws(() => win32.toFileURL('\\root-relative'), TypeError);
assert.throws(() => posix.toFileURL('relative'), TypeError);
assert.throws(() => posix.toFileURL('/bad\u0000path'), TypeError);
assert.throws(() => posix.toFileURL('/bad\uD800'), TypeError);

assert.throws(() => posix.normalize(null), TypeError);
assert.throws(() => posix.basename('a', 1), TypeError);

console.log('espath-test: fixed assertions passed');
