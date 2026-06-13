import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const requireFromTest = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cache = new Map();

const normalizeRelativePath = (absolutePath) => relative(rootDir, absolutePath).replaceAll('\\', '/');

const toFilePath = (request, parentPath) => {
  if (!request.startsWith('.')) return request;
  const base = resolve(dirname(parentPath), request);
  if (base.endsWith('.ts') || base.endsWith('.tsx')) return base;
  return `${base}.ts`;
};

export const loadTsModule = (relativePath) => {
  const absolutePath = resolve(rootDir, relativePath);

  if (cache.has(absolutePath)) {
    return cache.get(absolutePath).exports;
  }

  const module = { exports: {} };
  cache.set(absolutePath, module);

  const source = readFileSync(absolutePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;

  const localRequire = (request) => {
    const target = toFilePath(request, absolutePath);
    if (target.endsWith('.ts') || target.endsWith('.tsx')) {
      return loadTsModule(normalizeRelativePath(target));
    }
    return requireFromTest(request);
  };

  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: localRequire,
    console,
    Date,
    Math,
    Set,
    Map,
    Intl,
    Number,
    String,
    Object,
    Array
  }, { filename: absolutePath });

  return module.exports;
};
