<div align="center">

# ESPATH: Deterministic path and file-URI transformations for Adobe ExtendScript (ES3)

## ExtendScript Path = E.S.PATH

### POSIX and Windows lexical paths, explicit-cwd resolution, and RFC 8089 file URIs for Adobe Illustrator and other ExtendScript hosts

[![Spec: RFC 8089](https://img.shields.io/badge/spec-RFC%208089-success)](https://www.rfc-editor.org/rfc/rfc8089)
[![Differential: Node](https://img.shields.io/badge/differential-38%2C769%20assertions-purple)](#validation)
[![Engine parity](https://img.shields.io/badge/engine%20parity-live%2010%2F10-green)](#validation)
[![Adobe: Creative Suite](https://img.shields.io/badge/Adobe%20-Creative%20Suite-red?logo=adobe&logoColor=white)](https://extendscript.docsforadobe.dev/)
[![Engine](https://img.shields.io/badge/ExtendScript-ES3-green)](#compatibility)
[![Runtime size](https://img.shields.io/badge/runtime-24.4%20KiB-orange)](#installation)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL%203.0--or--later-blue)](https://www.gnu.org/licenses/gpl-3.0.html)

</div>

---

## Part Of The Same Toolkit

> Production-grade infrastructure for Adobe ExtendScript.

<table>
<tr>
<td width="50%" valign="top">

### Runtime Primitives

**[ESON](https://github.com/thelabcorner/eson)**  
Strict RFC 8259 JSON for ExtendScript.

**[ESB64](https://github.com/thelabcorner/es-b64)**  
Base64 and UTF-8 utilities.

**[ESARR](https://github.com/thelabcorner/es-arr)**  
ES5+ Array compatibility methods.

**[ESSTR](https://github.com/thelabcorner/es-str)**  
String whitespace and trim methods.

**[ESCHARS](https://github.com/thelabcorner/es-chars)**  
Native bulk byte operations.

**[ESHTTP](https://github.com/thelabcorner/es-http)**  
HTTP transport for ExtendScript automation.

**[ESTIMER](https://github.com/thelabcorner/es-timer)**  
Microsecond timing for ExtendScript automation.

**[ESRAND](https://github.com/thelabcorner/es-rand)**  
Deterministic random streams and sampling for ExtendScript.

**[ESUUID](https://github.com/thelabcorner/es-uuid)**  
RFC 9562 UUID generation, parsing, and conversion for ExtendScript.

**[ESENV](https://github.com/thelabcorner/es-env)**  
Environment and capability detection for ExtendScript.

**[ESPATH](https://github.com/thelabcorner/es-path)**  
Deterministic Windows/POSIX path and RFC 8089 file-URI transformations.

**[ESFS](https://github.com/thelabcorner/es-fs)**  
Synchronous ExtendScript File/Folder I/O with explicit text, BINARY, and replacement semantics.

**[ESHASH](https://github.com/thelabcorner/es-hash)**  
CRC-32/ISO-HDLC and SHA-256 for byte strings and UTF-8 text.

**[ESLOG](https://github.com/thelabcorner/es-log)**  
Structured logging with bounded text and JSONL sinks.

</td>
<td width="50%" valign="top">

### Build & Integration Tools

**[ESPACK](https://github.com/thelabcorner/espack)**  
Self-extracting ExternalObject bundles.

**[ESMIN](https://github.com/thelabcorner/es-min)**  
Minification for shipped JSX bundles.

**[ESABI](https://github.com/thelabcorner/esabi)**  
Modern ExternalObject ABI declarations for native integrations.

**[VectorIPC](https://github.com/thelabcorner/vector-ipc)**  
Bounded local IPC for scripting hosts and native plug-ins.

**[ESTC](https://github.com/thelabcorner/estc)**  
TypeScript-to-ExtendScript build, compatibility, and live-parse tooling.

**[ESDB](https://github.com/thelabcorner/esdb)**  
Native state and durable storage for Adobe tooling.

**[COMTool](https://github.com/thelabcorner/COMTool)**  
Guarded COM, ExtendScript, plug-in, and debugger automation for Adobe desktop apps.

**ESsemble** <sub>coming soon</sub>  
Typed framework, resolver, and composition layer for the ExtendScript toolkit.

**ESOBF** <sub>coming soon</sub>  
Obfuscation for hardened JSX distribution.

</td>
</tr>
</table>

Also from the same team: **[ArcFit.dev](https://arcfit.dev)**, deterministic arc warp for Illustrator.

---

## Table of Contents

- [Why ESPATH?](#why-espath)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [Path contract](#path-contract)
  - [RFC 8089 file URIs](#rfc-8089-file-uris)
  - [Adobe File values](#adobe-file-values)
- [Validation](#validation)
- [Performance](#performance)
- [Security Model](#security-model)
- [Compatibility](#compatibility)
- [Engine quirks that shaped the design](#engine-quirks-that-shaped-the-design)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Credits](#credits)
- [License](#license)

---

## Why ESPATH?

ExtendScript has host-specific file objects but no deterministic, host-independent path module equivalent to Node's `path.posix` and `path.win32`. ESPATH provides a pure lexical path layer whose results do not depend on `process.cwd()`, `Folder.current`, the filesystem, or per-drive ambient state.

POSIX and Windows behavior stay separate. `resolve()` requires an explicit absolute cwd, relative-relative operations refuse to invent hidden parent segments, and file-URI conversion is a distinct RFC 8089 boundary rather than an alias for Adobe's `File.fsName`, `fullName`, or `absoluteURI`.

---

## Features

- Separate `posix` and `win32` APIs for normalize, resolve, relative, dirname, basename, extname, and file-URI conversion.
- `resolve(cwd, ...paths)` requires an explicit absolute cwd and never reads ambient process or host cwd state.
- Seeded differential validation executes 38,769 assertions against `node:path.posix` and `node:path.win32` with zero divergences in the shared semantic domain.
- RFC 8089 conversion handles percent-encoded UTF-8, Windows drive paths, UNC paths, and POSIX absolute paths.
- File-URI parsing rejects query/fragment components, userinfo/ports, malformed UTF-8 escapes, encoded path separators, U+0000, and unpaired surrogates.
- Lexical path scanning preserves embedded U+0000 because it uses `charCodeAt()`; file-URI conversion deliberately rejects U+0000.
- Runtime code performs no filesystem I/O, reads no host/process environment, patches no built-ins, and has no native/ExternalObject lane.
- The current ESTC artifact is 24,960 bytes and passes both static Acorn ES3 and live Illustrator parsing.

---

## Installation

Install development dependencies and build the ESM, declarations, and ExtendScript artifact:

```bash
npm install
npm run build
```

Use the ESM API from development/Node tooling:

```ts
import { ESPATH, posix, win32 } from "espath";
```

For ExtendScript, load `dist/ESPATH.jsx`; it installs `$.global.ESPATH`. Generated TypeScript declarations are emitted to `dist/types/`.

Build/test tooling requires Node.js >=20. The runtime artifact itself targets ExtendScript ES3.

---

## Quick Start

```ts
import { ESPATH, posix, win32 } from "espath";

posix.normalize("/work//art/../final.ai");
// "/work/final.ai"

win32.resolve("C:\\work\\project", "assets", "..", "final.ai");
// "C:\\work\\project\\final.ai"

win32.toFileURL("C:\\Users\\Ada Lovelace\\Résumé #1\\100%.ai");
// "file:///C:/Users/Ada%20Lovelace/R%C3%A9sum%C3%A9%20%231/100%25.ai"

ESPATH.win32.basename("C:\\work\\final.ai");
// "final.ai"
```

---

## API

The public `PathDialect` methods are available on both named APIs and on the default `ESPATH` facade.

### Path contract

- `posix` recognizes `/`; `win32` recognizes both `/` and `\` on input and emits `\` in normalized results.
- `resolve(cwd, ...paths)` never consults `process.cwd()`, `Folder.current`, or another ambient cwd. POSIX `cwd` must be absolute. Windows `cwd` must be a fully qualified drive path or UNC path with a share.
- `relative(from, to)` is base-independent. Absolute paths must have compatible root styles; paths on different Windows devices return the normalized destination.
- Relative operands are accepted only when their **normalized leading `..` segment counts match**, including zero. A mismatch throws `TypeError` with guidance to resolve both paths against the same explicit cwd first.
- `relative()` rejects Windows drive-relative inputs. `resolve()` rejects a drive-relative input that does not match its explicit cwd instead of consulting an ambient per-drive cwd.
- `dirname`, `basename`, and `extname` are lexical operations and do not query the filesystem.

```ts
posix.relative("../source", "../output/file.ai");
// "../output/file.ai"

posix.relative("../source", "../../output/file.ai");
// throws TypeError: leading parent depths differ; use resolve() with one explicit cwd first

posix.resolve("/work/project", "../output/file.ai");
// "/work/output/file.ai"
```

### RFC 8089 file URIs

`toFileURL()` accepts absolute POSIX paths and fully qualified Windows drive/UNC paths. `fromFileURL()` accepts `file:` URIs with percent-encoded UTF-8 path components.

Query/fragment components, userinfo/ports, malformed or invalid UTF-8 escapes, percent-encoded path separators, U+0000, and unpaired surrogates are rejected rather than normalized into ambiguous path data.

### Adobe File values

File-URI functions are separate from Adobe's `File`/`Folder` representations. ESPATH does not reinterpret `.fsName`, `.fullName`, `.absoluteURI`, `File.encode()`, or `File.decode()` as scheme-less path APIs.

The live verifier records those Adobe values for comparison without calling exists/open/read/write/copy/move/delete. The current Illustrator result for `C:/ESPATH Probe/Résumé 100%/child.txt` observed Windows `fsName`, `/c/...` `fullName`, percent-encoded `absoluteURI`, and a successful `encode`/`decode` round trip.

---

## Validation

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | clean |
| Fixed vectors + differential | `npm test` | 38,769 assertions, seed 1337, zero divergences; 224 mismatched-parent-depth cases rejected |
| Static ES3 artifact | `npm run estc:static` | 24,960-byte `ESPATH.jsx` passes Acorn ES3 |
| Live parse | `npm run estc:live-parse` | passes on Illustrator 30.6.0 / ExtendScript 4.5.6 |
| Live behavior | `npm run live-verify` | 10/10 path/URI checks pass; reload replacement and varargs forwarding verified; no filesystem operations |

Differential comparisons are made only where ESPATH and Node share the same declared semantics. Relative-relative cases with unequal normalized parent depth assert ESPATH's explicit-cwd error rather than comparing against Node's hidden process cwd.

---

## Performance

### Node reference measurements

Node.js v22.23.2 on Windows x64, AMD Ryzen 9 5900X. The adversarial benchmark uses one warmup and five measured samples, reporting median and min/max microseconds per operation. These are Node measurements, not ExtendScript throughput claims.

The cancellation lane accumulates `s` segments and cancels them with `..`, exercising the current `normalizeTail()` `lastIndexOf()` + `slice()` pop behavior:

| Dialect | Input UTF-16 units | Canceled segments | Median µs/op (min–max) |
|---|---:|---:|---:|
| POSIX | 1,021 | 204 | 17.49 (15.77–27.19) |
| POSIX | 16,381 | 3,276 | 274.65 (237.90–279.38) |
| POSIX | 65,536 | 13,107 | 973.10 (970.90–1,314.40) |
| Win32 | 1,023 | 204 | 16.57 (15.40–29.13) |
| Win32 | 16,383 | 3,276 | 269.73 (259.50–270.00) |
| Win32 | 65,533 | 13,106 | 1,056.70 (942.00–1,492.10) |

At 65K units, the POSIX deep no-dot path measured 604.87 µs, the already-normalized identity path 203.03 µs, and the separator-heavy path 402.07 µs. For a 65.5K-unit percent-heavy Unicode POSIX path, `toFileURL()` measured 2,275.00 µs and `fromFileURL()` 1,514.30 µs; Win32 measured 2,317.33 µs and 1,400.30 µs respectively. URI encode and decode are separate benchmark lanes; `toFileURL()` includes input normalization and `fromFileURL()` includes parsing plus final normalization.

The existing string-tail implementation is retained. No array-stack alternative was added or A/B-benchmarked; Node scaling alone is insufficient evidence to replace it given the measured ExtendScript array behavior described below.

### Live ExtendScript measurements

The current release-candidate live verifier ran on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6. It uses two warmups and seven retained `$.hiresTimer` samples per lane, discarding non-positive and >10 s samples.

| Live lane | Input size | Loops/sample | Median µs/op (current release gate) |
|---|---:|---:|---:|
| POSIX short lexical normalize | 1,095 | 300 | 103.72 |
| Win32 short lexical normalize | 1,097 | 300 | 91.64 |
| Win32 long UNC lexical normalize | 1,109 | 30 | 3,637.57 |
| POSIX long lexical normalize | 1,095 | 30 | 3,518.43 |
| Win32 file-URI encode API | 1,115 | 20 | 5,915.00 |
| Win32 file-URI decode API | 1,139 URI units | 20 | 5,100.55 |

The earlier same-host measurement series produced medians of 103.34, 89.76, 3,593.53, 3,548.83, 5,869.60, and 5,094.35 µs/op for the same lanes. Both sets are retained as host/version-specific observations rather than generalized performance guarantees.

---

## Security Model

ESPATH is a pure lexical data-transform library. It does not execute source, access the filesystem, inspect `File.exists`, read ambient environment/cwd state, load native code, perform network I/O, or mutate Illustrator documents. It does not patch globals or prototypes.

File-URI decoding validates syntax and UTF-8 rather than passing malformed escapes through. Encoded separators, U+0000, and unpaired surrogates are rejected at the URI boundary to avoid producing ambiguous path values.

---

## Compatibility

| Target | Status |
|---|---|
| ExtendScript ES3 | ESTC-built JSX; static Acorn ES3 gate passes |
| Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 | live parse and 10/10 path/URI behavior checks pass |
| RFC 8089 file URIs | deterministic supported subset with explicit rejection rules |
| Node.js 20+ | ESM/declaration build and differential harness; Node 22.23.2 measured |
| Other ExtendScript hosts | ES3-oriented source; not live-measured here |

The ESTC project profile uses the Illustrator/2022 Types-for-Adobe declarations plus the local `src/globals.d.ts` overlay as compile-time input; that profile is not a claim that Illustrator 2022 and 2026 are behaviorally identical.

---

## Engine quirks that shaped the design

These are inherited sibling-library measurements, not ESPATH measurements. They are scoped to their fixtures and hosts and motivate implementation choices without being extrapolated beyond those workloads.

| Evidence source | Relevant inherited observation |
|---|---|
| [ESARR](https://github.com/thelabcorner/es-arr/blob/main/README.md#why-esarr) | On Illustrator 30.6.0 / ExtendScript 4.5.6, variable-index array reads scale superlinearly in the measured traversal fixture; a 32K traversal was about 800 ms. ESPATH therefore does not assume an indexed array stack is cheap. |
| [ESB64](https://github.com/thelabcorner/es-b64/blob/main/README.md#the-optimization-that-matters-array-writes-are-the-enemy) | In its codec fixtures, array writes measured about 15–25 µs each, `charCodeAt` about 0.76 µs, and small-piece concatenation about 0.2 µs. Its rope measurements were shape-sensitive. |
| [ESON](https://github.com/thelabcorner/eson/blob/main/README.md#engine-quirks-that-shaped-the-design) | ESON measured effectively quadratic concatenation in one workload and an ExtendScript regex hang for an anchored alternation/lookahead shape. ESPATH uses scanners rather than regex path parsing and does not generalize the concat result. |
| [ESSTR](https://github.com/thelabcorner/es-str/blob/main/README.md#engine-quirks-that-shaped-the-design) | `charAt()` returned an empty string at U+0000 while `charCodeAt()` returned code unit 0; `\s` also differed from modern trim semantics. ESPATH uses code-unit scanners. |
| [ESCHARS](https://github.com/thelabcorner/es-chars/blob/main/README.md#why-eschars) | `charCodeAt` measured about 0.95 µs/unit and one per-unit output transform wedged at 128K after 64K completed. ESPATH keeps those sibling limits separate from its own path scanner evidence. |
| [ESTIMER](https://github.com/thelabcorner/es-timer/blob/main/README.md#why-estimer) | `$.hiresTimer` is a delta clock whose first read is not a timestamp. ESPATH's live harness primes the timer and reports multiple samples. |

The live verifier additionally demonstrates that Adobe `File.fsName`, `fullName`, and `absoluteURI` are distinct representations. That host behavior is why ESPATH does not conflate Adobe File properties with RFC 8089 conversion.

---

## Development

```bash
npm run build
npm run typecheck
npm test
npm run benchmark
npm run estc:static
npm run estc:live-parse
npm run live-verify
npm run verify
npm run verify:engine
```

`npm run verify` is the portable/static gate. `npm run verify:engine` attaches to the existing local Illustrator/COMTool environment for real-engine evidence.

---

## Repository layout

```text
espath/
├── src/                         TypeScript path and URI implementation
├── tests/                       fixed, differential, benchmark, and live verification
├── espath-build.mjs             ESM/declaration/JSX build
├── extendscript.estc.config.mjs ESTC project configuration
├── package.json
├── tsconfig.json
└── README.md
```

Generated `dist/` outputs are ignored by Git and reproduced by `npm run build`.

---

## Credits

- [RFC 8089](https://www.rfc-editor.org/rfc/rfc8089) for file URI syntax and semantics.
- [Node.js `path` documentation](https://nodejs.org/api/path.html) and `node:path.posix`/`node:path.win32` as the differential oracle for the shared lexical behavior.
- [docsforadobe / ExtendScript documentation](https://extendscript.docsforadobe.dev/) for Adobe `File` representation behavior.
- [ESTC](https://github.com/thelabcorner/estc) and the sibling ES-family evidence cited above.

---

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

---

<p align="center"><small>ESPATH: ExtendScript Path. Explicit lexical paths and file URIs without ambient cwd or filesystem dependence.</small></p>
