import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, unlink } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as http from 'http';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

const AVATAR_SIZE = 400;
const AVATAR_QUALITY = 85;

@Injectable()
export class AvatarUploadService {
  private readonly logger = new Logger(AvatarUploadService.name);
  readonly avatarsDir = join(process.cwd(), 'uploads', 'avatars');

  constructor() {
    if (!existsSync(this.avatarsDir)) {
      mkdirSync(this.avatarsDir, { recursive: true });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private filename(userId: number): string {
    const rand = randomBytes(5).toString('hex'); // 10 chars
    return `user-${userId}-${rand}.webp`;
  }

  private publicPath(filename: string): string {
    return `/uploads/avatars/${filename}`;
  }

  /**
   * Removes an old local avatar file if it lives inside /uploads/avatars/.
   * Silently ignores missing files or non-local paths (e.g. legacy Google URLs).
   */
  deleteOldAvatar(profileImage?: string | null): void {
    if (!profileImage?.startsWith('/uploads/avatars/')) return;
    const filePath = join(process.cwd(), profileImage.slice(1));
    if (existsSync(filePath)) {
      unlink(filePath, (err) => {
        if (err) this.logger.warn(`Could not delete old avatar: ${filePath}`);
      });
    }
  }

  // ── Manual upload ─────────────────────────────────────────────────────────

  /**
   * Converts a multer temp file to WebP (400×400, cropped), moves it to
   * uploads/avatars/, removes the old avatar, returns the new public path.
   * Always deletes the temp file regardless of success or failure.
   */
  async processUploadedFile(
    tempPath: string,
    userId: number,
    oldProfileImage?: string | null,
  ): Promise<string> {
    const name = this.filename(userId);
    const dest = join(this.avatarsDir, name);

    try {
      await sharp(tempPath)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: AVATAR_QUALITY })
        .toFile(dest);
    } finally {
      // Always clean up the raw multer temp file
      unlink(tempPath, () => {});
    }

    this.deleteOldAvatar(oldProfileImage);
    return this.publicPath(name);
  }

  // ── Google avatar download ────────────────────────────────────────────────

  /**
   * Downloads the Google avatar at `googleUrl`, converts it to WebP
   * (400×400), saves it locally, removes the old avatar, and returns
   * the new public path. Returns null on any failure.
   */
  async downloadGoogleAvatar(
    googleUrl: string,
    userId: number,
    oldProfileImage?: string | null,
  ): Promise<string | null> {
    if (!googleUrl || !/^https?:\/\//i.test(googleUrl)) return null;

    // Request a larger resolution from Google
    const url = googleUrl.replace(/=s\d+-c$/, '=s400-c');
    const name = this.filename(userId);
    const dest = join(this.avatarsDir, name);

    try {
      const buffer = await this.fetchBuffer(url);

      await sharp(buffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: AVATAR_QUALITY })
        .toFile(dest);

      this.deleteOldAvatar(oldProfileImage);
      return this.publicPath(name);
    } catch (err) {
      this.logger.warn(
        `Google avatar download failed for userId=${userId}: ${(err as Error).message}`,
      );
      // Remove any partial file that may have been written by sharp
      unlink(dest, () => {});
      return null;
    }
  }

  // ── HTTP fetch ────────────────────────────────────────────────────────────

  private fetchBuffer(url: string, hops = 0): Promise<Buffer> {
    if (hops > 5) return Promise.reject(new Error('Too many redirects'));

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const chunks: Buffer[] = [];

      const req = protocol.get(url, { timeout: 10_000 }, (res) => {
        const { statusCode, headers } = res;

        // Follow redirects
        if ([301, 302, 307, 308].includes(statusCode!)) {
          res.resume();
          if (!headers.location) return reject(new Error('Redirect without Location header'));
          this.fetchBuffer(headers.location, hops + 1).then(resolve).catch(reject);
          return;
        }

        if (statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${statusCode}`));
        }

        const ct = headers['content-type'] ?? '';
        if (!ct.startsWith('image/')) {
          res.resume();
          return reject(new Error(`Expected image, got: ${ct}`));
        }

        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}
