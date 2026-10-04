// Reading the report and the configuration named on the command line. The path given may be one file or a folder; a
// folder is listed once, without following any entry: a symbolic link in it is reported in a note and never followed,
// a subfolder is not read, and a device, a pipe or a socket is passed over. A file is opened once, with O_NOFOLLOW where
// the system has it, and its type and size are taken from the open handle, so a file swapped for a link, a pipe or a
// device after it was listed is refused, and a file over its limit is refused before it is read. A file that holds a
// null byte, is UTF-16 or is not valid UTF-8 is refused as not text. The tool writes nothing to disk.

import { constants } from 'node:fs';
import { lstat, open, opendir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const FILE_LIMITS = { maxConfigBytes: 1024 * 1024, maxFileBytes: 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024, maxEntries: 5000 };

// An error with the path in its message and the reason alone in .reason, so a caller can show its own path.
export function fileError(path, reason) {
  return Object.assign(new Error(`${path}: ${reason}`), { reason });
}

function megabytes(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString('en-US')} MB` : `${bytes.toLocaleString('en-US')} byte`;
}

// The flags a file is opened with: read only, and not through a symbolic link where the system can refuse one.
export const OPEN_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);

// The whole file, or an error when it is not a regular file or is over the limit.
export async function readBounded(path, maxBytes) {
  let handle;
  try {
    handle = await open(resolve(path), OPEN_FLAGS);
  } catch (error) {
    if (error.code === 'ENOENT') throw fileError(path, 'no such file');
    if (error.code === 'ELOOP' || error.code === 'EMLINK') throw fileError(path, 'is a symbolic link, which is not followed');
    throw fileError(path, `cannot be read (${error.code ?? error.message})`);
  }
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) throw fileError(path, 'not a regular file');
    if (opened.size > maxBytes) throw fileError(path, `${opened.size.toLocaleString('en-US')} bytes is over the ${megabytes(maxBytes)} limit`);
    const buffer = Buffer.alloc(opened.size);
    let read = 0;
    while (read < opened.size) {
      const { bytesRead } = await handle.read(buffer, read, opened.size - read, read);
      if (bytesRead === 0) break;
      read += bytesRead;
    }
    return buffer.subarray(0, read);
  } finally {
    await handle.close();
  }
}

function toPosix(path) {
  return sep === '/' ? path : path.split(sep).join('/');
}

// A path as shown in a report: relative to the base folder with forward slashes; a path outside it is shown absolute,
// also with forward slashes.
export function displayPath(path, base) {
  const rel = relative(base, path);
  if (rel === '') return '.';
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return toPosix(path);
  return toPosix(rel);
}

// A file holds binary data when its first 8,000 bytes hold a null byte.
export const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

const isUtf16 = (buffer) => buffer.length >= 2 && ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff));

// UTF-8 text without a leading byte order mark, or null when the bytes are not valid UTF-8.
export function decodeText(buffer) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  } catch {
    return null;
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// The text of a file, or an error whose .reason says why it is not read: missing, a link, not a regular file, over the
// limit, UTF-16, binary or not UTF-8. shown is the path the error names.
export async function readText(full, shown, maxBytes) {
  const buffer = await readBounded(full, maxBytes).catch((error) => {
    throw fileError(shown, error.reason ?? error.message);
  });
  if (isUtf16(buffer)) throw fileError(shown, 'is UTF-16; only UTF-8 is read');
  if (isBinary(buffer)) throw fileError(shown, 'holds binary data (a null byte); only text is read');
  const text = decodeText(buffer);
  if (text === null) throw fileError(shown, 'is not valid UTF-8; only UTF-8 text is read');
  return { size: buffer.length, text };
}

// One file named on the command line, read as text: { file, full, size, text }.
export async function readTextFile(path, base, maxBytes) {
  const full = resolve(base, path);
  const shown = displayPath(full, base);
  return { file: shown, full, ...(await readText(full, shown, maxBytes)) };
}

// What the path named on the command line is: { full, shown, kind: 'file' | 'folder' }. The path itself may be a
// symbolic link, because the person who runs the tool named it.
export async function inspectPath(path, base) {
  const full = resolve(base, path);
  const shown = displayPath(full, base);
  let info;
  try {
    info = await stat(full);
  } catch (error) {
    if (error.code === 'ENOENT') throw fileError(shown, 'no such file or folder');
    throw fileError(shown, `cannot be read (${error.code ?? error.message})`);
  }
  if (info.isDirectory()) return { full, shown, kind: 'folder' };
  if (info.isFile()) return { full, shown, kind: 'file' };
  throw fileError(shown, 'is not a file or a folder');
}

// The entries of a folder, without following any of them: { files, folders, links, other }, each a list of names sorted
// by their code units, so the order does not depend on the locale or the file system.
export async function listFolder(full, shown, maxEntries) {
  const out = { files: [], folders: [], links: [], other: [] };
  let count = 0;
  let dir;
  try {
    dir = await opendir(full, { bufferSize: 64 });
  } catch (error) {
    throw fileError(shown, `cannot be read (${error.code ?? error.message})`);
  }
  try {
    for await (const entry of dir) {
      count += 1;
      if (count > maxEntries) throw fileError(shown, `holds more than ${maxEntries.toLocaleString('en-US')} entries; check a smaller folder`);
      let kind = entry.isSymbolicLink() ? 'links' : entry.isFile() ? 'files' : entry.isDirectory() ? 'folders' : null;
      if (kind === null) {
        // Some file systems give no type with the entry; ask for it without following a link.
        const l = await lstat(join(full, entry.name)).catch(() => null);
        kind = !l ? 'other' : l.isSymbolicLink() ? 'links' : l.isFile() ? 'files' : l.isDirectory() ? 'folders' : 'other';
      }
      out[kind].push(entry.name);
    }
  } finally {
    // The loop closes the folder when it ends; a folder left open by an early error is closed here.
    await dir.close().catch(() => {});
  }
  const byUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  for (const k of ['files', 'folders', 'links', 'other']) out[k].sort(byUnits);
  return out;
}
