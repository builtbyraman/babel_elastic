import { getAutoPipeline } from './useConversion';

// ── getAutoPipeline ───────────────────────────────────────────────────────────
// This pure function selects the sigma pipeline based on the rule's logsource.
// It drives every auto-conversion — wrong pipeline = wrong output format.

describe('getAutoPipeline', () => {
  describe('windows product', () => {
    it('returns ecs_windows for product=windows', () => {
      expect(getAutoPipeline({ product: 'windows' })).toBe('ecs_windows');
    });

    it('is case-insensitive for product', () => {
      expect(getAutoPipeline({ product: 'Windows' })).toBe('ecs_windows');
      expect(getAutoPipeline({ product: 'WINDOWS' })).toBe('ecs_windows');
    });
  });

  describe('linux product', () => {
    it('returns ecs_linux for product=linux', () => {
      expect(getAutoPipeline({ product: 'linux' })).toBe('ecs_linux');
    });

    it('is case-insensitive', () => {
      expect(getAutoPipeline({ product: 'Linux' })).toBe('ecs_linux');
    });
  });

  describe('macos product', () => {
    it('returns ecs_macos_esf for product=macos', () => {
      expect(getAutoPipeline({ product: 'macos' })).toBe('ecs_macos_esf');
    });
  });

  describe('zeek', () => {
    it('returns ecs_zeek_beats for product=zeek', () => {
      expect(getAutoPipeline({ product: 'zeek' })).toBe('ecs_zeek_beats');
    });

    it('returns ecs_zeek_beats when category contains "zeek"', () => {
      expect(getAutoPipeline({ product: '', category: 'zeek_dns' })).toBe('ecs_zeek_beats');
      expect(getAutoPipeline({ category: 'dns_zeek' })).toBe('ecs_zeek_beats');
    });
  });

  describe('kubernetes', () => {
    it('returns ecs_kubernetes for product=kubernetes', () => {
      expect(getAutoPipeline({ product: 'kubernetes' })).toBe('ecs_kubernetes');
    });

    it('returns ecs_kubernetes when category contains "kubernetes"', () => {
      expect(getAutoPipeline({ category: 'kubernetes_audit' })).toBe('ecs_kubernetes');
    });
  });

  describe('defaults', () => {
    it('returns ecs_windows for empty logsource', () => {
      expect(getAutoPipeline({})).toBe('ecs_windows');
    });

    it('returns ecs_windows for unknown product', () => {
      expect(getAutoPipeline({ product: 'splunk' })).toBe('ecs_windows');
    });

    it('returns ecs_windows when logsource is undefined', () => {
      expect(getAutoPipeline(undefined)).toBe('ecs_windows');
    });

    it('returns ecs_windows for cloud products without a specific pipeline', () => {
      expect(getAutoPipeline({ product: 'aws' })).toBe('ecs_windows');
      expect(getAutoPipeline({ product: 'azure' })).toBe('ecs_windows');
    });
  });

  describe('product takes precedence over category', () => {
    it('uses product over category when both set', () => {
      // product=linux should win even if category mentions zeek
      expect(getAutoPipeline({ product: 'linux', category: 'zeek_dns' })).toBe('ecs_linux');
    });

    it('windows beats kubernetes in category', () => {
      expect(getAutoPipeline({ product: 'windows', category: 'kubernetes_audit' })).toBe('ecs_windows');
    });
  });
});
