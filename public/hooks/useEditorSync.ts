import { useState, useCallback } from 'react';
import yaml from 'js-yaml';
import { SigmaRule } from '../types';

interface SyncState {
  yaml: string;
  rule: SigmaRule | null;
  parseError: string | null;
}

interface SyncActions {
  setYaml: (value: string) => void;
  updateRule: (patch: Partial<SigmaRule>) => void;
}

function parseRule(text: string): { rule: SigmaRule | null; error: string | null } {
  try {
    if (!text.trim()) return { rule: null, error: 'Empty rule' };
    const parsed = yaml.load(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { rule: null, error: 'Root must be a YAML mapping' };
    }
    return { rule: parsed as SigmaRule, error: null };
  } catch (e) {
    return { rule: null, error: e instanceof Error ? e.message : 'YAML parse error' };
  }
}

function dumpRule(rule: SigmaRule): string {
  return yaml.dump(rule, { indent: 4, lineWidth: -1, noRefs: true });
}

export function useEditorSync(initialYaml: string): [SyncState, SyncActions] {
  const [state, setState] = useState<SyncState>(() => {
    const { rule, error } = parseRule(initialYaml);
    return { yaml: initialYaml, rule, parseError: error };
  });

  const setYaml = useCallback((value: string) => {
    const { rule, error } = parseRule(value);
    setState({ yaml: value, rule, parseError: error });
  }, []);

  const updateRule = useCallback((patch: Partial<SigmaRule>) => {
    setState(prev => {
      const merged = { ...prev.rule, ...patch } as SigmaRule;
      return { yaml: dumpRule(merged), rule: merged, parseError: null };
    });
  }, []);

  return [state, { setYaml, updateRule }];
}