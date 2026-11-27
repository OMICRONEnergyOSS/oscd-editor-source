import { getSchemaKey, sniffSclVersion } from './scl-version.js';

import type { Finding, ValidationOutcome } from '../types.js';

export const SCHEMA_VALIDATOR_ID = 'schema';

const SCHEMA_LOAD_TIMEOUT_MS = 15_000;
const VALIDATION_TIMEOUT_MS = 20_000;

// Fixed internal names; the engine treats a name ending in `.xsd` as a schema.
const XSD_NAME = 'scl.xsd';
const XML_NAME = 'document.xml';

interface EngineError {
  file: string;
  code: number;
  message: string;
  level: number;
  node: string;
  line: number;
  column: number;
  part: string;
}

interface EngineResult {
  file: string;
  valid: boolean;
  code: number;
}

interface EngineLoaded {
  file: string;
  loaded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEngineResult(msg: unknown): msg is EngineResult {
  return isRecord(msg) && 'valid' in msg && 'file' in msg;
}

function isEngineLoaded(msg: unknown): msg is EngineLoaded {
  return isRecord(msg) && 'loaded' in msg && 'file' in msg;
}

function isEngineError(msg: unknown): msg is EngineError {
  return (
    isRecord(msg) &&
    'file' in msg &&
    'message' in msg &&
    !('valid' in msg) &&
    !('loaded' in msg)
  );
}

function toFinding(error: EngineError): Finding {
  const finding: Finding = {
    validatorId: SCHEMA_VALIDATOR_ID,
    severity: error.level === 1 ? 'warning' : 'error',
    message: error.message,
    raw: error,
  };
  if (error.line > 0) {
    finding.location =
      error.column > 0
        ? { line: error.line, column: error.column }
        : { line: error.line };
  }
  return finding;
}

/**
 * A Blob worker carries the engine and its WASM binary inline, so no asset URL
 * has to be resolved and a cross-origin plugin load behaves like a local one.
 */
function createWorker(engineSource: string, wasmBase64: string): Worker {
  const prologue = `self.Module = { wasmBinary: Uint8Array.from(atob(${JSON.stringify(wasmBase64)}), function (c) { return c.charCodeAt(0); }).buffer };\n`;
  const epilogue = `
    self.onmessage = function (e) {
      Module.ready.then(function (mod) {
        if (String(e.data.name).toLowerCase().endsWith('.xsd')) {
          mod.init(e.data.content, e.data.name);
        } else {
          mod.validate(e.data.content, e.data.name);
        }
      });
    };
  `;
  const url = URL.createObjectURL(
    new Blob([prologue, engineSource, '\n', epilogue], {
      type: 'application/javascript',
    }),
  );
  try {
    return new Worker(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function request<T>(
  worker: Worker,
  content: { content: string; name: string },
  handle: (data: unknown, done: (value: T) => void) => void,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (event: MessageEvent<unknown>) =>
      handle(event.data, (value) => {
        cleanup();
        resolve(value);
      });
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || `${label} failed in the worker.`));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${label} timed out after ${timeoutMs} ms.`));
    }, timeoutMs);

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(content);
  });
}

async function runEngine(
  xml: string,
  xsd: string,
  engineSource: string,
  wasmBase64: string,
): Promise<ValidationOutcome> {
  const worker = createWorker(engineSource, wasmBase64);
  try {
    const loaded = await request<boolean>(
      worker,
      { content: xsd, name: XSD_NAME },
      (data, done) => {
        if (isEngineLoaded(data)) {
          done(data.loaded);
        }
      },
      SCHEMA_LOAD_TIMEOUT_MS,
      'Loading the schema',
    );
    if (!loaded) {
      return { status: 'failed', reason: 'The schema could not be loaded.' };
    }

    const errors: EngineError[] = [];
    const notes: string[] = [];
    const result = await request<EngineResult>(
      worker,
      { content: xml, name: XML_NAME },
      (data, done) => {
        if (isEngineResult(data) && data.file === XML_NAME) {
          done(data);
        } else if (isEngineError(data)) {
          errors.push(data);
        } else if (typeof data === 'string') {
          notes.push(data);
        }
      },
      VALIDATION_TIMEOUT_MS,
      'Schema validation',
    );

    if (result.valid) {
      return { status: 'completed', findings: [] };
    }
    // Malformed XML arrives as ordinary errors; silence means the engine gave up.
    if (errors.length > 0) {
      return { status: 'completed', findings: errors.map(toFinding) };
    }
    return {
      status: 'failed',
      reason:
        notes.join(' ') ||
        'The schema validator rejected the document without a diagnostic.',
    };
  } finally {
    worker.terminate();
  }
}

export async function validateSchema(xml: string): Promise<ValidationOutcome> {
  if (typeof Worker === 'undefined') {
    return {
      status: 'failed',
      reason: 'Schema validation needs Web Worker support.',
    };
  }

  const version = sniffSclVersion(xml);
  if (version === null) {
    return {
      status: 'failed',
      reason: 'Cannot determine the SCL version: no <SCL> root element found.',
    };
  }

  const schemaKey = getSchemaKey(version);
  if (schemaKey === null) {
    return {
      status: 'failed',
      reason: `No bundled schema for SCL version '${version.version}', revision '${version.revision}', release '${version.release}'.`,
    };
  }

  try {
    const [{ xsdAssets }, { engineSource, engineWasmBase64 }] =
      await Promise.all([
        import('./generated/xsd-assets.js'),
        import('./generated/engine-assets.js'),
      ]);
    return await runEngine(
      xml,
      xsdAssets[schemaKey],
      engineSource,
      engineWasmBase64,
    );
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
