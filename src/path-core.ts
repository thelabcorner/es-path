// ESPATH core: deterministic lexical path operations and RFC 8089 file URIs.
// This module has no host, environment, or filesystem dependencies.

export type DialectKind = 'posix' | 'win32';

export interface PathDialect {
  readonly kind: DialectKind;
  readonly sep: string;
  readonly delimiter: string;
  normalize(path: string): string;
  join(...paths: string[]): string;
  /** Resolve against an explicit absolute cwd; this API never reads a process or host cwd. */
  resolve(cwd: string, ...paths: string[]): string;
  /**
   * Compute a base-independent relative path. Relative operands must have equal
   * normalized leading `..` depth; otherwise resolve both against an explicit cwd first.
   */
  relative(from: string, to: string): string;
  isAbsolute(path: string): boolean;
  dirname(path: string): string;
  basename(path: string, suffix?: string): string;
  extname(path: string): string;
  /** Convert an absolute native path to an RFC 8089 `file:` URI. */
  toFileURL(path: string): string;
  /** Parse an RFC 8089 `file:` URI; Adobe scheme-less File forms are not accepted here. */
  fromFileURL(uri: string): string;
}

interface RootInfo {
  kind: string;
  device: string;
  rootEnd: number;
  absolute: boolean;
  server: string;
  share: string;
}

function requireString(value: any, label: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(label + ' must be a string');
  }
  return value;
}

function isAsciiLetter(code: number): boolean {
  if (code >= 65 && code <= 90) { return true; }
  if (code >= 97 && code <= 122) { return true; }
  return false;
}

function isWinSeparator(code: number): boolean {
  if (code === 47) { return true; }
  if (code === 92) { return true; }
  return false;
}

function rootInfo(kind: string, device: string, rootEnd: number, absolute: boolean,
  server: string, share: string): RootInfo {
  return {
    kind: kind,
    device: device,
    rootEnd: rootEnd,
    absolute: absolute,
    server: server,
    share: share
  };
}

function posixRoot(path: string): RootInfo {
  if (path.length > 0 && path.charCodeAt(0) === 47) {
    return rootInfo('root', '', 1, true, '', '');
  }
  return rootInfo('relative', '', 0, false, '', '');
}

function winRoot(path: string): RootInfo {
  var length = path.length;
  var first = 0;
  var second = 0;
  var third = 0;
  var index = 0;
  var serverStart = 0;
  var serverEnd = 0;
  var shareStart = 0;
  var shareEnd = 0;
  var server = '';
  var share = '';
  var device = '';

  if (length === 0) {
    return rootInfo('relative', '', 0, false, '', '');
  }

  first = path.charCodeAt(0);
  if (isWinSeparator(first)) {
    if (length > 1) {
      second = path.charCodeAt(1);
    }
    if (length > 2) {
      third = path.charCodeAt(2);
    }

    if (length > 2 && isWinSeparator(second) && !isWinSeparator(third)) {
      serverStart = 2;
      index = serverStart;
      while (index < length) {
        if (isWinSeparator(path.charCodeAt(index))) { break; }
        index++;
      }
      serverEnd = index;
      server = path.slice(serverStart, serverEnd);
      if (serverEnd === length) {
        return rootInfo('root', '', 1, true, '', '');
      }

      index = serverEnd;
      while (index < length) {
        if (!isWinSeparator(path.charCodeAt(index))) { break; }
        index++;
      }
      shareStart = index;
      while (index < length) {
        if (isWinSeparator(path.charCodeAt(index))) { break; }
        index++;
      }
      shareEnd = index;
      if (shareEnd > shareStart) {
        share = path.slice(shareStart, shareEnd);
        device = '\\\\' + server + '\\' + share;
        if (shareEnd < length) {
          return rootInfo('unc', device, shareEnd + 1, true, server, share);
        }
        return rootInfo('unc', device, shareEnd, true, server, share);
      }

      return rootInfo('root', '', 1, true, '', '');
    }

    return rootInfo('root', '', 1, true, '', '');
  }

  if (length >= 2 && path.charCodeAt(1) === 58 && isAsciiLetter(first)) {
    device = path.slice(0, 2);
    if (length > 2 && isWinSeparator(path.charCodeAt(2))) {
      return rootInfo('drive', device, 3, true, '', '');
    }
    return rootInfo('drive', device, 2, false, '', '');
  }

  return rootInfo('relative', '', 0, false, '', '');
}

function rootPrefixWin(root: RootInfo): string {
  if (root.kind === 'drive') {
    if (root.absolute) { return root.device + '\\'; }
    return root.device;
  }
  if (root.kind === 'unc' || root.kind === 'unc-server') {
    return root.device + '\\';
  }
  if (root.absolute) { return '\\'; }
  return '';
}

function separatorCode(code: number, windows: boolean): boolean {
  if (code === 47) { return true; }
  if (windows && code === 92) { return true; }
  return false;
}

function isAlreadyNormalized(path: string, windows: boolean, root: RootInfo): boolean {
  var length = path.length;
  var start = root.rootEnd;
  var previousSeparator = false;
  var segmentLength = 0;
  var dotCount = 0;
  var onlyDots = true;
  var code = 0;
  var rootCode = 0;
  var i = 0;

  if (root.kind === 'drive' && !root.absolute && start === length) {
    return false;
  }
  if (windows && root.kind === 'unc' && start === length) {
    if (!isWinSeparator(path.charCodeAt(length - 1))) { return false; }
  }
  if (!windows && root.absolute && start === 1) {
    previousSeparator = true;
  }
  if (windows && root.absolute && start > 0) {
    rootCode = path.charCodeAt(start - 1);
    if (rootCode === 47) { return false; }
    if (isWinSeparator(rootCode)) { previousSeparator = true; }
  }

  for (i = start; i < length; i++) {
    code = path.charCodeAt(i);
    if (separatorCode(code, windows)) {
      if (windows && code === 47) { return false; }
      if (previousSeparator) { return false; }
      if (segmentLength > 0 && onlyDots) {
        if (dotCount === 1 || dotCount === 2) { return false; }
      }
      previousSeparator = true;
      segmentLength = 0;
      dotCount = 0;
      onlyDots = true;
    } else {
      previousSeparator = false;
      segmentLength++;
      if (code === 46 && onlyDots) {
        dotCount++;
      } else {
        onlyDots = false;
      }
    }
  }

  if (segmentLength > 0 && onlyDots) {
    if (dotCount === 1 || dotCount === 2) { return false; }
  }
  return true;
}

function normalizeTail(path: string, start: number, windows: boolean, allowAboveRoot: boolean): string {
  var separator = windows ? '\\' : '/';
  var length = path.length;
  var output = '';
  var segmentStart = start;
  var dotCount = 0;
  var onlyDots = true;
  var code = 0;
  var isSeparator = false;
  var segmentLength = 0;
  var lastSeparator = 0;
  var lastStart = 0;
  var previousLength = 0;
  var previousIsDotDot = false;
  var i = 0;

  for (i = start; i <= length; i++) {
    isSeparator = false;
    if (i === length) {
      isSeparator = true;
    } else {
      code = path.charCodeAt(i);
      if (separatorCode(code, windows)) { isSeparator = true; }
    }

    if (!isSeparator) {
      if (code === 46 && onlyDots) {
        dotCount++;
      } else {
        onlyDots = false;
      }
      continue;
    }

    segmentLength = i - segmentStart;
    if (segmentLength === 0) {
      segmentStart = i + 1;
      dotCount = 0;
      onlyDots = true;
      continue;
    }

    if (onlyDots && dotCount === 1) {
      segmentStart = i + 1;
      dotCount = 0;
      onlyDots = true;
      continue;
    }

    if (onlyDots && dotCount === 2) {
      if (output.length > 0) {
        lastSeparator = output.lastIndexOf(separator);
        lastStart = lastSeparator + 1;
        previousLength = output.length - lastStart;
        previousIsDotDot = false;
        if (previousLength === 2) {
          if (output.charCodeAt(lastStart) === 46 && output.charCodeAt(lastStart + 1) === 46) {
            previousIsDotDot = true;
          }
        }
        if (!previousIsDotDot) {
          if (lastSeparator < 0) {
            output = '';
          } else {
            output = output.slice(0, lastSeparator);
          }
        } else if (allowAboveRoot) {
          if (output.length > 0) { output += separator; }
          output += '..';
        }
      } else if (allowAboveRoot) {
        output = '..';
      }
      segmentStart = i + 1;
      dotCount = 0;
      onlyDots = true;
      continue;
    }

    if (output.length > 0) { output += separator; }
    output += path.slice(segmentStart, i);
    segmentStart = i + 1;
    dotCount = 0;
    onlyDots = true;
  }

  return output;
}

function normalize(pathValue: string, windows: boolean): string {
  var path = requireString(pathValue, 'path');
  var length = path.length;
  var root: RootInfo;
  var tail: string;
  var prefix: string;
  var output: string;
  var trailing = false;
  var lastCode = 0;

  if (length === 0) { return '.'; }
  root = windows ? winRoot(path) : posixRoot(path);
  if (isAlreadyNormalized(path, windows, root)) { return path; }

  if (length > 0) {
    lastCode = path.charCodeAt(length - 1);
    if (separatorCode(lastCode, windows)) { trailing = true; }
  }

  tail = normalizeTail(path, root.rootEnd, windows, !root.absolute);
  if (windows) {
    prefix = rootPrefixWin(root);
    output = prefix + tail;
    if (root.kind === 'drive' && !root.absolute && tail.length === 0) {
      output = root.device + '.';
    }
  } else {
    prefix = root.absolute ? '/' : '';
    output = prefix + tail;
  }

  if (output.length === 0) { output = '.'; }
  if (trailing) {
    lastCode = output.charCodeAt(output.length - 1);
    if (!separatorCode(lastCode, windows)) {
      if (windows) { output += '\\'; }
      else { output += '/'; }
    }
  }
  return output;
}

function join(paths: ArrayLike<string>, windows: boolean): string {
  var output = '';
  var separator = windows ? '\\' : '/';
  var i = 0;
  var part = '';
  var rootRelativeBase = false;
  var leading = 1;
  for (i = 0; i < paths.length; i++) {
    part = requireString(paths[i], 'path segment');
    if (part.length === 0) { continue; }
    if (output.length === 0) {
      output = part;
      if (windows && part.length === 1 && isWinSeparator(part.charCodeAt(0))) {
        rootRelativeBase = true;
      }
    } else {
      output += separator;
      output += part;
    }
  }
  if (output.length === 0) { output = '.'; }
  if (rootRelativeBase) {
    while (leading < output.length && isWinSeparator(output.charCodeAt(leading))) { leading++; }
    if (leading > 1) { output = output.slice(0, 1) + output.slice(leading); }
  }
  return normalize(output, windows);
}

function stripResolvedTrailingSeparator(path: string, windows: boolean): string {
  var root = windows ? winRoot(path) : posixRoot(path);
  var end = path.length;
  while (end > root.rootEnd && separatorCode(path.charCodeAt(end - 1), windows)) { end--; }
  return path.slice(0, end);
}

function prependTail(front: string, back: string, separator: string): string {
  if (front.length === 0) { return back; }
  if (back.length === 0) { return front; }
  return front + separator + back;
}

function resolvePosix(cwdValue: string, paths: ArrayLike<string>, startIndex: number): string {
  var cwd = requireString(cwdValue, 'cwd');
  var cwdRoot = posixRoot(cwd);
  var tail = '';
  var path = '';
  var i = 0;
  var currentRoot: RootInfo;

  if (!cwdRoot.absolute) { throw new TypeError('cwd must be an absolute POSIX path'); }
  for (i = paths.length - 1; i >= startIndex; i--) {
    path = requireString(paths[i], 'path segment');
    if (path.length === 0) { continue; }
    currentRoot = posixRoot(path);
    tail = prependTail(path.slice(currentRoot.rootEnd), tail, '/');
    if (currentRoot.absolute) {
      return stripResolvedTrailingSeparator(normalize('/' + tail, false), false);
    }
  }
  tail = prependTail(cwd.slice(cwdRoot.rootEnd), tail, '/');
  return stripResolvedTrailingSeparator(normalize('/' + tail, false), false);
}

function sameDevice(a: string, b: string): boolean {
  if (a.toLowerCase() === b.toLowerCase()) { return true; }
  return false;
}

function resolveWin32(cwdValue: string, paths: ArrayLike<string>, startIndex: number): string {
  var cwd = requireString(cwdValue, 'cwd');
  var cwdRoot = winRoot(cwd);
  var device = '';
  var deviceKind = '';
  var tail = '';
  var path = '';
  var currentRoot: RootInfo;
  var absolute = false;
  var i = 0;
  var prefix = '';

  if (!cwdRoot.absolute || cwdRoot.device.length === 0) {
    throw new TypeError('cwd must be a fully qualified absolute Windows path');
  }
  if (cwdRoot.kind === 'unc-server') {
    throw new TypeError('cwd must include a UNC share');
  }

  for (i = paths.length - 1; i >= startIndex; i--) {
    path = requireString(paths[i], 'path segment');
    if (path.length === 0) { continue; }
    currentRoot = winRoot(path);

    if (currentRoot.device.length > 0) {
      if (device.length > 0 && !sameDevice(currentRoot.device, device)) {
        if (absolute) { break; }
        continue;
      }
      if (device.length === 0) {
        device = currentRoot.device;
        deviceKind = currentRoot.kind;
      }
    }

    if (currentRoot.absolute && !absolute) {
      tail = prependTail(path.slice(currentRoot.rootEnd), tail, '\\');
      absolute = true;
    }

    if (absolute) {
      if (device.length > 0) { break; }
      continue;
    }

    tail = prependTail(path.slice(currentRoot.rootEnd), tail, '\\');
  }

  if (!absolute) {
    if (device.length > 0 && !sameDevice(device, cwdRoot.device)) {
      throw new TypeError('drive-relative paths require cwd on the same drive');
    }
    tail = prependTail(cwd.slice(cwdRoot.rootEnd), tail, '\\');
    device = cwdRoot.device;
    deviceKind = cwdRoot.kind;
  } else if (device.length === 0) {
    device = cwdRoot.device;
    deviceKind = cwdRoot.kind;
  }

  if (deviceKind === 'drive') {
    prefix = device + '\\';
  } else if (deviceKind === 'unc' || deviceKind === 'unc-server') {
    prefix = device + '\\';
  } else {
    prefix = cwdRoot.device + '\\';
  }
  return stripResolvedTrailingSeparator(normalize(prefix + tail, true), true);
}

function resolve(cwd: string, paths: ArrayLike<string>, startIndex: number, windows: boolean): string {
  if (windows) { return resolveWin32(cwd, paths, startIndex); }
  return resolvePosix(cwd, paths, startIndex);
}

function isAbsolute(pathValue: string, windows: boolean): boolean {
  var path = requireString(pathValue, 'path');
  if (windows) { return winRoot(path).absolute; }
  return posixRoot(path).absolute;
}

function dirname(pathValue: string, windows: boolean): string {
  var path = requireString(pathValue, 'path');
  var length = path.length;
  var root: RootInfo;
  var rootEnd = 0;
  var end = length;
  var index = 0;
  var code = 0;
  var separator = windows ? '\\' : '/';

  if (length === 0) { return '.'; }
  root = windows ? winRoot(path) : posixRoot(path);
  rootEnd = root.rootEnd;
  if (!windows && length > 2 && path.charCodeAt(0) === 47 && path.charCodeAt(1) === 47 &&
    path.charCodeAt(2) !== 47) {
    rootEnd = 2;
  }

  while (end > rootEnd) {
    code = path.charCodeAt(end - 1);
    if (!separatorCode(code, windows)) { break; }
    end--;
  }
  if (end <= rootEnd) {
    if (windows) { return rootPrefixWin(root); }
    if (root.absolute) { return path.slice(0, rootEnd); }
    return '.';
  }

  index = end - 1;
  while (index >= rootEnd) {
    code = path.charCodeAt(index);
    if (separatorCode(code, windows)) { break; }
    index--;
  }
  if (index < rootEnd) {
    if (windows && root.device.length > 0) {
      if (root.absolute) { return rootPrefixWin(root); }
      return root.device;
    }
    if (root.absolute) { return path.slice(0, rootEnd); }
    return '.';
  }

  return path.slice(0, index);
}

function basename(pathValue: string, suffixValue: string | undefined, windows: boolean): string {
  var path = requireString(pathValue, 'path');
  var suffix = suffixValue;
  var end = path.length;
  var start = end - 1;
  var code = 0;
  var base = '';
  var root: RootInfo;

  if (suffix !== void 0) { suffix = requireString(suffix, 'suffix'); }
  while (end > 0) {
    code = path.charCodeAt(end - 1);
    if (!separatorCode(code, windows)) { break; }
    end--;
  }
  if (windows) {
    root = winRoot(path);
    if (root.kind === 'drive' && end <= root.rootEnd) { return ''; }
  }
  start = end - 1;
  while (start >= 0) {
    code = path.charCodeAt(start);
    if (separatorCode(code, windows)) { break; }
    start--;
  }
  base = path.slice(start + 1, end);
  if (suffix !== void 0 && suffix.length > 0 && suffix.length <= base.length) {
    if (base.slice(base.length - suffix.length) === suffix) {
      return base.slice(0, base.length - suffix.length);
    }
  }
  return base;
}

function extname(pathValue: string, windows: boolean): string {
  var base = basename(pathValue, void 0, windows);
  var lastDot = -1;
  var i = 0;
  var code = 0;

  if (base.length === 0 || base === '.' || base === '..') { return ''; }
  for (i = 0; i < base.length; i++) {
    code = base.charCodeAt(i);
    if (code === 46) { lastDot = i; }
  }
  if (lastDot <= 0) { return ''; }
  return base.slice(lastDot);
}

function skipSeparators(path: string, start: number, windows: boolean): number {
  var index = start;
  while (index < path.length) {
    if (!separatorCode(path.charCodeAt(index), windows)) { break; }
    index++;
  }
  return index;
}

function segmentEnd(path: string, start: number, windows: boolean): number {
  var index = start;
  while (index < path.length) {
    if (separatorCode(path.charCodeAt(index), windows)) { break; }
    index++;
  }
  return index;
}

function segmentsEqual(a: string, aStart: number, aEnd: number,
  b: string, bStart: number, bEnd: number, windows: boolean): boolean {
  var length = aEnd - aStart;
  var i = 0;
  var aCode = 0;
  var bCode = 0;
  var lowerA = '';
  var lowerB = '';

  if (length !== bEnd - bStart) { return false; }
  if (!windows) {
    if (a.slice(aStart, aEnd) === b.slice(bStart, bEnd)) { return true; }
    return false;
  }
  lowerA = a.slice(aStart, aEnd).toLowerCase();
  lowerB = b.slice(bStart, bEnd).toLowerCase();
  for (i = 0; i < length; i++) {
    aCode = lowerA.charCodeAt(i);
    bCode = lowerB.charCodeAt(i);
    if (aCode !== bCode) { return false; }
  }
  return true;
}

function leadingParentDepth(path: string, windows: boolean): number {
  var count = 0;
  var start = skipSeparators(path, 0, windows);
  var end = 0;
  while (start < path.length) {
    end = segmentEnd(path, start, windows);
    if (end - start !== 2 || path.charCodeAt(start) !== 46 || path.charCodeAt(start + 1) !== 46) {
      break;
    }
    count++;
    start = skipSeparators(path, end, windows);
  }
  return count;
}

function relative(fromValue: string, toValue: string, windows: boolean): string {
  var from = requireString(fromValue, 'from');
  var to = requireString(toValue, 'to');
  var normalizedFrom = stripResolvedTrailingSeparator(normalize(from, windows), windows);
  var normalizedTo = stripResolvedTrailingSeparator(normalize(to, windows), windows);
  var fromRoot: RootInfo;
  var toRoot: RootInfo;
  var absoluteFrom = false;
  var absoluteTo = false;
  var fromStart = 0;
  var toStart = 0;
  var fromIndex = 0;
  var toIndex = 0;
  var fromEnd = 0;
  var toEnd = 0;
  var output = '';
  var separator = windows ? '\\' : '/';
  var common = true;

  if (windows) {
    fromRoot = winRoot(normalizedFrom);
    toRoot = winRoot(normalizedTo);
    absoluteFrom = fromRoot.absolute;
    absoluteTo = toRoot.absolute;
    if (absoluteFrom !== absoluteTo) {
      throw new TypeError('relative() requires both paths to use the same root style');
    }
    if (absoluteFrom) {
      if (fromRoot.device.length === 0 || toRoot.device.length === 0) {
        throw new TypeError('relative() requires fully qualified Windows paths');
      }
      if (fromRoot.kind === 'unc-server' || toRoot.kind === 'unc-server') {
        throw new TypeError('relative() requires UNC paths to include a share');
      }
      if (!sameDevice(fromRoot.device, toRoot.device)) { return normalizedTo; }
      fromStart = fromRoot.rootEnd;
      toStart = toRoot.rootEnd;
    } else {
      if (fromRoot.device.length > 0 || toRoot.device.length > 0) {
        throw new TypeError('relative() does not resolve drive-relative paths');
      }
    }
  } else {
    fromRoot = posixRoot(normalizedFrom);
    toRoot = posixRoot(normalizedTo);
    absoluteFrom = fromRoot.absolute;
    absoluteTo = toRoot.absolute;
    if (absoluteFrom !== absoluteTo) {
      throw new TypeError('relative() requires both paths to use the same root style');
    }
    if (absoluteFrom) {
      fromStart = 1;
      toStart = 1;
    }
  }

  if (!absoluteFrom && !absoluteTo &&
    leadingParentDepth(normalizedFrom, windows) !== leadingParentDepth(normalizedTo, windows)) {
    throw new TypeError('relative() requires equal leading .. depth; resolve both paths against an explicit cwd first');
  }
  if (normalizedFrom === '.') { fromStart = normalizedFrom.length; }
  if (normalizedTo === '.') { toStart = normalizedTo.length; }
  fromIndex = skipSeparators(normalizedFrom, fromStart, windows);
  toIndex = skipSeparators(normalizedTo, toStart, windows);

  while (fromIndex < normalizedFrom.length && toIndex < normalizedTo.length) {
    fromEnd = segmentEnd(normalizedFrom, fromIndex, windows);
    toEnd = segmentEnd(normalizedTo, toIndex, windows);
    common = segmentsEqual(normalizedFrom, fromIndex, fromEnd,
      normalizedTo, toIndex, toEnd, windows);
    if (!common) { break; }
    fromIndex = skipSeparators(normalizedFrom, fromEnd, windows);
    toIndex = skipSeparators(normalizedTo, toEnd, windows);
  }

  while (fromIndex < normalizedFrom.length) {
    fromEnd = segmentEnd(normalizedFrom, fromIndex, windows);
    if (output.length > 0) { output += separator; }
    output += '..';
    fromIndex = skipSeparators(normalizedFrom, fromEnd, windows);
  }

  while (toIndex < normalizedTo.length) {
    toEnd = segmentEnd(normalizedTo, toIndex, windows);
    if (output.length > 0) { output += separator; }
    output += normalizedTo.slice(toIndex, toEnd);
    toIndex = skipSeparators(normalizedTo, toEnd, windows);
  }
  return output;
}

function hexDigit(value: number): string {
  var digit = 0;
  if (value < 10) { digit = 48 + value; }
  else { digit = 55 + value; }
  return String.fromCharCode(digit);
}

function isUriSafeAscii(code: number): boolean {
  if (code >= 65 && code <= 90) { return true; }
  if (code >= 97 && code <= 122) { return true; }
  if (code >= 48 && code <= 57) { return true; }
  if (code === 45 || code === 46 || code === 95 || code === 126) { return true; }
  if (code === 33 || code === 36 || code === 38 || code === 39 || code === 40 || code === 41) { return true; }
  if (code === 42 || code === 43 || code === 44 || code === 59 || code === 61) { return true; }
  if (code === 58 || code === 64) { return true; }
  return false;
}

function percentByte(output: string, value: number): string {
  var high = Math.floor(value / 16);
  var low = value - high * 16;
  return output + '%' + hexDigit(high) + hexDigit(low);
}

function encodePath(path: string, windows: boolean): string {
  var output = '';
  var code = 0;
  var low = 0;
  var point = 0;
  var b1 = 0;
  var b2 = 0;
  var b3 = 0;
  var b4 = 0;
  var i = 0;
  var isSeparator = false;

  while (i < path.length) {
    code = path.charCodeAt(i);
    if (code === 0) { throw new TypeError('file URI paths cannot contain U+0000'); }
    isSeparator = false;
    if (code === 47) { isSeparator = true; }
    if (windows && code === 92) { isSeparator = true; }
    if (isSeparator) {
      output += '/';
      i++;
      continue;
    }

    point = code;
    if (code >= 55296 && code <= 56319) {
      if (i + 1 >= path.length) { throw new TypeError('file URI path contains an unpaired surrogate'); }
      low = path.charCodeAt(i + 1);
      if (low < 56320 || low > 57343) { throw new TypeError('file URI path contains an unpaired surrogate'); }
      point = 65536 + (code - 55296) * 1024 + (low - 56320);
      i++;
    } else if (code >= 56320 && code <= 57343) {
      throw new TypeError('file URI path contains an unpaired surrogate');
    }

    if (point < 128) {
      if (isUriSafeAscii(point)) {
        output += String.fromCharCode(point);
      } else {
        output = percentByte(output, point);
      }
      i++;
      continue;
    }

    if (point <= 2047) {
      b1 = 192 + Math.floor(point / 64);
      b2 = 128 + (point - Math.floor(point / 64) * 64);
      output = percentByte(output, b1);
      output = percentByte(output, b2);
    } else if (point <= 65535) {
      b1 = 224 + Math.floor(point / 4096);
      b2 = 128 + Math.floor((point - Math.floor(point / 4096) * 4096) / 64);
      b3 = 128 + (point - Math.floor(point / 64) * 64);
      output = percentByte(output, b1);
      output = percentByte(output, b2);
      output = percentByte(output, b3);
    } else {
      b1 = 240 + Math.floor(point / 262144);
      b2 = 128 + Math.floor((point - Math.floor(point / 262144) * 262144) / 4096);
      b3 = 128 + Math.floor((point - Math.floor(point / 4096) * 4096) / 64);
      b4 = 128 + (point - Math.floor(point / 64) * 64);
      output = percentByte(output, b1);
      output = percentByte(output, b2);
      output = percentByte(output, b3);
      output = percentByte(output, b4);
    }
    i++;
  }
  return output;
}

function validUncHost(host: string): boolean {
  var i = 0;
  var code = 0;
  for (i = 0; i < host.length; i++) {
    code = host.charCodeAt(i);
    if (isAsciiLetter(code)) { continue; }
    if (code >= 48 && code <= 57) { continue; }
    if (code === 45 || code === 46 || code === 95) { continue; }
    return false;
  }
  if (host.length === 0) { return false; }
  return true;
}

function toFileURL(pathValue: string, windows: boolean): string {
  var path = requireString(pathValue, 'path');
  var normalized = normalize(path, windows);
  var root: RootInfo;
  var encoded = '';

  if (!windows) {
    root = posixRoot(normalized);
    if (!root.absolute) { throw new TypeError('toFileURL() requires an absolute POSIX path'); }
    return 'file://' + encodePath(normalized, false);
  }

  root = winRoot(normalized);
  if (!root.absolute || root.device.length === 0) {
    throw new TypeError('toFileURL() requires a fully qualified Windows path');
  }
  if (root.kind === 'drive') {
    encoded = encodePath(normalized.slice(root.rootEnd), true);
    return 'file:///' + root.device + '/' + encoded;
  }
  if (root.kind === 'unc') {
    if (!validUncHost(root.server)) { throw new TypeError('UNC server name is not supported in a file URI'); }
    encoded = encodePath(root.share, false);
    if (normalized.length > root.rootEnd) {
      encoded += '/' + encodePath(normalized.slice(root.rootEnd), true);
    }
    if (normalized.charCodeAt(normalized.length - 1) === 92 && encoded.charCodeAt(encoded.length - 1) !== 47) {
      encoded += '/';
    }
    return 'file://' + root.server + '/' + encoded;
  }
  throw new TypeError('toFileURL() requires a drive path or a UNC path with a share');
}

function hexValue(code: number): number {
  if (code >= 48 && code <= 57) { return code - 48; }
  if (code >= 65 && code <= 70) { return code - 55; }
  if (code >= 97 && code <= 102) { return code - 87; }
  return -1;
}

function percentValue(uri: string, index: number): number {
  var high = 0;
  var low = 0;
  if (index + 2 >= uri.length) { throw new TypeError('malformed percent escape in file URI'); }
  high = hexValue(uri.charCodeAt(index + 1));
  low = hexValue(uri.charCodeAt(index + 2));
  if (high < 0 || low < 0) { throw new TypeError('malformed percent escape in file URI'); }
  return high * 16 + low;
}

function decodeUriPath(uriPath: string, windows: boolean): string {
  var output = '';
  var length = uriPath.length;
  var i = 0;
  var code = 0;
  var b1 = 0;
  var b2 = 0;
  var b3 = 0;
  var b4 = 0;
  var point = 0;
  var needed = 0;
  var minPoint = 0;
  var j = 0;
  var continuation = 0;

  while (i < length) {
    code = uriPath.charCodeAt(i);
    if (code === 47) {
      if (windows) { output += '\\'; }
      else { output += '/'; }
      i++;
      continue;
    }
    if (code === 92) { throw new TypeError('file URI must use forward-slash separators'); }

    if (code !== 37) {
      if (code > 127 || code < 33) { throw new TypeError('file URI path must be ASCII percent-encoded'); }
      if (!isUriSafeAscii(code)) { throw new TypeError('reserved file URI path characters must be percent-encoded'); }
      output += String.fromCharCode(code);
      i++;
      continue;
    }

    b1 = percentValue(uriPath, i);
    i += 3;
    point = 0;
    needed = 0;
    minPoint = 0;
    if (b1 < 128) {
      point = b1;
    } else if (b1 >= 194 && b1 <= 223) {
      point = b1 - 192;
      needed = 1;
      minPoint = 128;
    } else if (b1 >= 224 && b1 <= 239) {
      point = b1 - 224;
      needed = 2;
      minPoint = 2048;
    } else if (b1 >= 240 && b1 <= 244) {
      point = b1 - 240;
      needed = 3;
      minPoint = 65536;
    } else {
      throw new TypeError('invalid UTF-8 in file URI path');
    }

    b2 = 0;
    b3 = 0;
    b4 = 0;
    for (j = 0; j < needed; j++) {
      if (i >= length || uriPath.charCodeAt(i) !== 37) {
        throw new TypeError('invalid UTF-8 percent sequence in file URI path');
      }
      continuation = percentValue(uriPath, i);
      i += 3;
      if (continuation < 128 || continuation > 191) {
        throw new TypeError('invalid UTF-8 continuation in file URI path');
      }
      point = point * 64 + continuation - 128;
      if (j === 0) { b2 = continuation; }
      if (j === 1) { b3 = continuation; }
      if (j === 2) { b4 = continuation; }
    }

    if (needed > 0 && point < minPoint) { throw new TypeError('overlong UTF-8 in file URI path'); }
    if (point > 1114111) { throw new TypeError('UTF-8 code point out of range in file URI path'); }
    if (point >= 55296 && point <= 57343) { throw new TypeError('UTF-8 encodes a surrogate in file URI path'); }
    if (point === 0) { throw new TypeError('file URI paths cannot contain U+0000'); }
    if (point === 47 || point === 92) { throw new TypeError('encoded separators are not accepted in file URI path segments'); }

    if (point <= 65535) {
      output += String.fromCharCode(point);
    } else {
      point -= 65536;
      output += String.fromCharCode(55296 + Math.floor(point / 1024));
      output += String.fromCharCode(56320 + (point - Math.floor(point / 1024) * 1024));
    }
  }
  return output;
}

function isValidHost(host: string): boolean {
  return validUncHost(host);
}

function fromFileURL(uriValue: string, windows: boolean): string {
  var uri = requireString(uriValue, 'uri');
  var rest = '';
  var authority = '';
  var path = '';
  var slash = -1;
  var lowerHost = '';
  var decoded = '';
  var firstSlash = -1;
  var driveCode = 0;
  var pathRoot = '';

  if (uri.length < 5 || uri.slice(0, 5).toLowerCase() !== 'file:') {
    throw new TypeError('fromFileURL() requires a file: URI');
  }
  rest = uri.slice(5);
  if (rest.slice(0, 2) === '//') {
    slash = rest.indexOf('/', 2);
    if (slash < 0) {
      authority = rest.slice(2);
      path = '';
    } else {
      authority = rest.slice(2, slash);
      path = rest.slice(slash);
    }
  } else {
    path = rest;
  }

  if (path.length === 0 || path.charCodeAt(0) !== 47) {
    throw new TypeError('file URI path must be absolute');
  }
  if (path.indexOf('?') >= 0 || path.indexOf('#') >= 0) {
    throw new TypeError('file URI query and fragment components are not supported');
  }
  if (authority.indexOf('@') >= 0 || authority.indexOf(':') >= 0) {
    throw new TypeError('file URI userinfo and ports are not supported');
  }
  if (authority.length > 0 && !isValidHost(authority)) {
    throw new TypeError('file URI authority is not a supported host name');
  }
  lowerHost = authority.toLowerCase();

  if (!windows) {
    if (authority.length > 0 && lowerHost !== 'localhost') {
      throw new TypeError('POSIX file URLs with a remote authority are not supported');
    }
    if (path.length > 1 && path.charCodeAt(1) === 47) {
      throw new TypeError('hostless UNC-style file URIs are not supported');
    }
    decoded = decodeUriPath(path, false);
    return normalize(decoded, false);
  }

  if (authority.length > 0 && lowerHost !== 'localhost') {
    if (path.length < 2 || path.charCodeAt(1) === 47) {
      throw new TypeError('UNC file URI must include a share path segment');
    }
    firstSlash = path.indexOf('/', 1);
    if (firstSlash < 0) { firstSlash = path.length; }
    if (firstSlash === 1) { throw new TypeError('UNC file URI must include a share path segment'); }
    decoded = decodeUriPath(path.slice(1), true);
    if (decoded === '.' || decoded === '..' || decoded.length === 0) {
      throw new TypeError('UNC file URI must include a valid share name');
    }
    return normalize('\\\\' + authority + '\\' + decoded, true);
  }

  if (path.length < 4 || path.charCodeAt(1) === 47) {
    throw new TypeError('Windows file URI must start with /<drive>:/ or use a UNC authority');
  }
  driveCode = path.charCodeAt(1);
  if (!isAsciiLetter(driveCode) || path.charCodeAt(2) !== 58 || path.charCodeAt(3) !== 47) {
    throw new TypeError('Windows file URI must start with /<drive>:/ or use a UNC authority');
  }
  decoded = decodeUriPath(path.slice(4), true);
  pathRoot = String.fromCharCode(driveCode) + ':\\';
  return normalize(pathRoot + decoded, true);
}

function makePathDialect(kind: DialectKind): PathDialect {
  var windows = kind === 'win32';
  var pathApi: PathDialect = {
    kind: kind,
    sep: windows ? '\\' : '/',
    delimiter: windows ? ';' : ':',
    normalize: function (path: string): string { return normalize(path, windows); },
    join: function (): string { return join(arguments, windows); },
    resolve: function (cwd: string): string { return resolve(cwd, arguments, 1, windows); },
    relative: function (from: string, to: string): string { return relative(from, to, windows); },
    isAbsolute: function (path: string): boolean { return isAbsolute(path, windows); },
    dirname: function (path: string): string { return dirname(path, windows); },
    basename: function (path: string, suffix?: string): string { return basename(path, suffix, windows); },
    extname: function (path: string): string { return extname(path, windows); },
    toFileURL: function (path: string): string { return toFileURL(path, windows); },
    fromFileURL: function (uri: string): string { return fromFileURL(uri, windows); }
  };
  return pathApi;
}

export var posix: PathDialect = makePathDialect('posix');
export var win32: PathDialect = makePathDialect('win32');
