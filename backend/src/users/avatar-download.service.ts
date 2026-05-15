import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, createWriteStream, unlink } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as http from 'http';
import { randomBytes } from 'crypto';

@Injectable()
export class AvatarDownloadService {
  private readonly logger = new Logger(AvatarDownloadService.name);
  private readonly avatarsDir = join(process.cwd(), 'uploads', 'avatars');

  constructor() {
    if (!existsSync(this.avatarsDir)) {
      mkdirSync(this.avatarsDir, { recursive: true });
    }
  }

  /**
   * Downloads the Google avatar at `googleUrl`, saves it locally under
   * uploads/avatars/, and returns the public path (e.g. /uploads/avatars/avatar-abc.jpg).
   * Returns null if the download fails for any reason.
   */
  async downloadGoogleAvatar(googleUrl: string): Promise<string | null> {
    if (!googleUrl || !/^https?:\/\//i.test(googleUrl)) return null;

    // Request 200 px instead of the default 96 px for better quality
    const url = googleUrl.replace(/=s\d+-c$/, '=s200-c');

    const filename = `avatar-${randomBytes(16).toString('hex')}.jpg`;
    const destPath = join(this.avatarsDir, filename);
    const publicPath = `/uploads/avatars/${filename}`;

    try {
      await this.streamToFile(url, destPath);
      return publicPath;
    } catch (err) {
      this.logger.warn(`Avatar download failed for ${googleUrl}: ${(err as Error).message}`);
      unlink(destPath, () => {});
      return null;
    }
  }

  private streamToFile(url: string, dest: string, redirectCount = 0): Promise<void> {
    if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = createWriteStream(dest);
      let settled = false;

      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        file.close();
        if (err) reject(err);
        else resolve();
      };

      const req = protocol.get(url, { timeout: 10_000 }, (res) => {
        const { statusCode, headers } = res;

        if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
          res.resume();
          if (!headers.location) return done(new Error('Redirect with no location'));
          this.streamToFile(headers.location, dest, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (statusCode !== 200) {
          res.resume();
          return done(new Error(`HTTP ${statusCode}`));
        }

        const contentType = headers['content-type'] ?? '';
        if (!contentType.startsWith('image/')) {
          res.resume();
          return done(new Error(`Not an image: ${contentType}`));
        }

        res.pipe(file);
        file.on('finish', () => done());
        file.on('error', (e) => done(e as Error));
      });

      req.on('error', (e) => done(e));
      req.on('timeout', () => {
        req.destroy();
        done(new Error('Download timeout'));
      });
    });
  }
}
