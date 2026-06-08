import { renderHook, act } from '@testing-library/react';
import { useEditorSync } from './useEditorSync';

const VALID_YAML = `title: Test Rule
status: experimental
description: A test rule
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: test
    condition: selection
level: medium
`;

describe('useEditorSync', () => {
  describe('initialization', () => {
    it('parses valid initial YAML into a rule object', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));
      const [state] = result.current;
      expect(state.rule).not.toBeNull();
      expect(state.rule?.title).toBe('Test Rule');
      expect(state.parseError).toBeNull();
    });

    it('sets parseError for invalid initial YAML', () => {
      const { result } = renderHook(() => useEditorSync('invalid: yaml: :::'));
      const [state] = result.current;
      expect(state.rule).toBeNull();
      expect(state.parseError).toBeTruthy();
    });

    it('sets rule to null and error for empty string', () => {
      const { result } = renderHook(() => useEditorSync(''));
      const [state] = result.current;
      expect(state.rule).toBeNull();
      expect(state.parseError).toBeTruthy();
    });

    it('preserves the raw yaml string', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));
      const [state] = result.current;
      expect(state.yaml).toBe(VALID_YAML);
    });
  });

  describe('setYaml', () => {
    it('updates yaml and re-parses rule on valid input', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      const newYaml = 'title: Updated Rule\nstatus: stable\n';
      act(() => {
        result.current[1].setYaml(newYaml);
      });

      const [state] = result.current;
      expect(state.yaml).toBe(newYaml);
      expect(state.rule?.title).toBe('Updated Rule');
      expect(state.parseError).toBeNull();
    });

    it('sets parseError on invalid YAML', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].setYaml('not valid yaml: {{{{');
      });

      const [state] = result.current;
      expect(state.rule).toBeNull();
      expect(state.parseError).toBeTruthy();
    });

    it('clears previous parseError when valid YAML is provided', () => {
      const { result } = renderHook(() => useEditorSync(''));

      act(() => {
        result.current[1].setYaml(VALID_YAML);
      });

      expect(result.current[0].parseError).toBeNull();
      expect(result.current[0].rule).not.toBeNull();
    });

    it('handles YAML that is not a mapping (e.g. list)', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].setYaml('- item1\n- item2\n');
      });

      expect(result.current[0].rule).toBeNull();
      expect(result.current[0].parseError).toContain('mapping');
    });
  });

  describe('updateRule', () => {
    it('merges patch into current rule and regenerates YAML', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ title: 'Patched Title' });
      });

      const [state] = result.current;
      expect(state.rule?.title).toBe('Patched Title');
      expect(state.yaml).toContain('Patched Title');
      expect(state.parseError).toBeNull();
    });

    it('merges nested fields without losing existing fields', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ level: 'high' });
      });

      const [state] = result.current;
      expect(state.rule?.level).toBe('high');
      expect(state.rule?.title).toBe('Test Rule'); // unchanged
      expect(state.rule?.status).toBe('experimental'); // unchanged
    });

    it('can update logsource product', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ logsource: { category: 'process_creation', product: 'linux' } });
      });

      expect((result.current[0].rule?.logsource as any)?.product).toBe('linux');
    });

    it('can add tags array', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ tags: ['attack.execution', 'attack.t1059.001'] });
      });

      const tags = result.current[0].rule?.tags as string[];
      expect(tags).toContain('attack.execution');
      expect(tags).toContain('attack.t1059.001');
    });

    it('can set x-ir-phase', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ 'x-ir-phase': 'detection' });
      });

      expect(result.current[0].rule?.['x-ir-phase']).toBe('detection');
      expect(result.current[0].yaml).toContain('x-ir-phase');
    });

    it('generates parseable YAML from updateRule', () => {
      const { result } = renderHook(() => useEditorSync(VALID_YAML));

      act(() => {
        result.current[1].updateRule({ title: 'Regenerated', level: 'critical' });
      });

      const { yaml, parseError } = result.current[0];
      expect(parseError).toBeNull();
      // The generated YAML should parse back correctly
      const yaml2 = require('js-yaml').load(yaml) as any;
      expect(yaml2.title).toBe('Regenerated');
      expect(yaml2.level).toBe('critical');
    });
  });

  describe('round-trip fidelity', () => {
    it('setYaml then updateRule preserves all fields', () => {
      const { result } = renderHook(() => useEditorSync(''));

      act(() => {
        result.current[1].setYaml(VALID_YAML);
      });
      act(() => {
        result.current[1].updateRule({ level: 'high' });
      });

      const rule = result.current[0].rule;
      expect(rule?.title).toBe('Test Rule');
      expect(rule?.level).toBe('high');
      expect(rule?.status).toBe('experimental');
    });
  });
});
