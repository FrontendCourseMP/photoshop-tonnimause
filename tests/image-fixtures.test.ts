import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/images/manifest.json';
import { readMetadata } from '../src/image/metadata';

describe('complete PNG and JPEG fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const bytes = readFileSync(new URL(`./fixtures/images/${fixture.name}`, import.meta.url));
      expect(readMetadata(new Uint8Array(bytes).buffer)).toMatchObject({
        format: fixture.format, width: fixture.width, height: fixture.height,
        colorBits: fixture.colorBits, alphaBits: fixture.alphaBits,
        transparency: fixture.transparency,
      });
    });
  }
});
