# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Core Logging API**: `createLogger(options)` with five standard methods (`debug()`, `info()`, `success()`, `warn()`, `error()`).
- **Severity-Level Filtering**: Threshold filtering based on numerical severity weights (`debug: 10`, `info: 20`, `warn: 30`, `error: 40`), with `success` adopting `info` filtering severity.
- **Terminal Colors**: Dependency-free ANSI escape sequence colorization with automatic terminal color detection respecting `FORCE_COLOR`, `NO_COLOR`, and interactive TTY streams.
- **24-Hour Timestamps**: Zero-padded local timestamps formatted as `YYYY-MM-DD HH:mm:ss`.
- **Sensitive-Data Redaction**: Recursive sensitive-field redaction across plain objects, nested objects, arrays, Maps, Sets, and Errors with case-insensitive exact matching and cycle safety.
- **Child Loggers**: Hierarchical child loggers via `logger.child(context)` with persistent contextual metadata, deep inheritance, and context override precedence.
- **Safe Serialization Utilities**: Circular reference handling via `[Circular]`, `BigInt` serialization, Error stack preservation, and non-mutating deep cloning.
- **ES Module Architecture**: Native Node.js 18+ ESM package exports with zero external runtime dependencies.
