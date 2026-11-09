import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl } from '@/lib/utils';

describe('getYouTubeEmbedUrl', () => {
  const id = 'dQw4w9WgXcQ';
  const embed = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;

  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?feature=share&v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ])('対応形式を embed URL に変換する: %s', (url) => {
    expect(getYouTubeEmbedUrl(url)).toBe(embed);
  });

  it.each([undefined, null, '', 'https://example.com/watch?v=x', 'https://youtu.be/short'])(
    '対応外・空は null を返す: %s',
    (url) => {
      expect(getYouTubeEmbedUrl(url)).toBeNull();
    },
  );
});
