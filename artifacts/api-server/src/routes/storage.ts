import express from 'express';
import { Readable } from 'stream';
import { Router, type IRouter, type Request, type Response } from 'express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { adminJwtMiddleware } from '../lib/adminAuth';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/** Allowed MIME types for clinic logo uploads */
const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * POST /storage/uploads/logo
 *
 * Server-proxied logo upload.  The client sends the raw image bytes directly
 * to this endpoint; the server validates MIME type and size before writing to
 * GCS.  This guarantees that upload constraints are enforced at the actual
 * ingestion boundary — unlike a presigned-URL approach where the client could
 * PUT arbitrary content after the metadata check.
 *
 * Requires a valid admin JWT (Authorization: Bearer <token>).
 * Returns { objectPath } — store this in the database.
 */
router.post(
  '/storage/uploads/logo',
  // 1. Verify admin JWT before reading any body bytes.
  adminJwtMiddleware,
  // 2. Buffer raw bytes; express.raw enforces the size limit (413 on overflow).
  express.raw({ limit: MAX_LOGO_SIZE_BYTES, type: () => true }),
  async (req: Request, res: Response) => {
    // 3. Validate MIME type from the Content-Type request header.
    const contentType = (req.headers['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_LOGO_MIME_TYPES.has(contentType)) {
      res.status(400).json({
        error: 'Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)',
      });
      return;
    }

    // 4. Ensure the body is a non-empty Buffer (express.raw guarantees this for
    //    matched requests, but guard defensively).
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Empty or invalid file body' });
      return;
    }

    try {
      // 5. Write directly to GCS under the logos/ prefix; return the object path.
      const objectPath = await objectStorageService.uploadLogoObject(
        req.body,
        contentType,
      );
      res.json({ objectPath });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading logo');
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve clinic logo objects from the private object dir.
 * ONLY paths under the `logos/` prefix are served without authentication —
 * logos are public branding assets displayed to all app users.
 * Any other path (other private objects) returns 403 to prevent enumeration.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;

  // Restrict to the logos/ namespace — the only public prefix this task creates.
  // All other private objects require explicit auth/ACL to serve.
  if (!wildcardPath.startsWith('logos/')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
