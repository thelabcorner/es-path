import { posix, win32, PathDialect, DialectKind } from './path-core';

export { posix, win32 };
export { PathDialect, DialectKind };

export var ESPATH: { posix: PathDialect; win32: PathDialect } = {
  posix: posix,
  win32: win32
};

export default ESPATH;
