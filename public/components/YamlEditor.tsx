import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiPanel,
  EuiBadge,
  EuiCallOut,
  EuiTitle,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { ValidationIssue, QualityScoreResult } from '../types';
import { ApiService } from '../services/api';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  parseError: string | null;
  apiService?: ApiService;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({ value, onChange, parseError, apiService }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange]
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef   = useRef<HTMLDivElement>(null);

  const syncGutter = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const lineCount  = value ? value.split('\n').length : 1;
  const digitCount = Math.max(String(lineCount).length, 2);

  const errorLine = parseError
    ? parseInt((parseError.match(/\((\d+):\d+\)/) ?? [])[1] ?? '0', 10)
    : 0;

  const [validating, setValidating] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validated, setValidated] = useState(false);
  const [quality, setQuality] = useState<QualityScoreResult | null>(null);

  useEffect(() => {
    setValidated(false);
    setIssues([]);
    setQuality(null);
  }, [value]);

  const handleValidate = useCallback(async () => {
    if (!apiService) return;
    setValidating(true);
    try {
      const result = await apiService.validateRule(value);
      setIssues((result as any).issues ?? []);
      setValidated(true);
      apiService.getRuleQuality(value).then((q: any) => setQuality(q)).catch(() => {});
    } catch {
      setIssues([{ type: 'error', rule: 'api_error', message: 'Validation service unavailable' }]);
      setValidated(true);
    } finally {
      setValidating(false);
    }
  }, [apiService, value]);

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');

  const qualityColor = quality
    ? quality.score >= 80 ? 'success' : quality.score >= 60 ? 'warning' : 'danger'
    : 'default';

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <EuiTitle size="xs"><h3>YAML Editor</h3></EuiTitle>
        </div>

        {quality && (
          <EuiToolTip
            content={quality.reasons.length > 0 ? quality.reasons.join(' · ') : 'No issues found'}
          >
            <EuiBadge color={qualityColor} style={{ marginRight: 6, cursor: 'default' }}>
              Q: {quality.score}
            </EuiBadge>
          </EuiToolTip>
        )}

        {parseError ? (
          <EuiBadge color="danger">Parse Error</EuiBadge>
        ) : validated ? (
          errors.length > 0 ? (
            <EuiBadge color="danger">{errors.length} error{errors.length > 1 ? 's' : ''}</EuiBadge>
          ) : warnings.length > 0 ? (
            <EuiBadge color="warning">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</EuiBadge>
          ) : (
            <EuiBadge color="success">Valid</EuiBadge>
          )
        ) : (
          <EuiBadge color="default">Not validated</EuiBadge>
        )}
        {apiService && (
          <EuiButtonEmpty
            size="xs"
            iconType={validating ? undefined : 'check'}
            onClick={handleValidate}
            disabled={validating || !!parseError}
            style={{ marginLeft: 8 }}
          >
            {validating ? <EuiLoadingSpinner size="s" /> : 'Validate'}
          </EuiButtonEmpty>
        )}
      </div>

      {parseError && (
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          <EuiCallOut title={parseError} color="danger" iconType="error" size="s" />
        </div>
      )}

      {validated && issues.length > 0 && (
        <div style={{ flexShrink: 0, marginBottom: 8, maxHeight: 120, overflowY: 'auto' }}>
          {issues.map((issue, i) => (
            <EuiCallOut
              key={i}
              title={issue.message}
              color={issue.type === 'error' ? 'danger' : 'warning'}
              iconType={issue.type === 'error' ? 'error' : 'warning'}
              size="s"
              style={{ marginBottom: 4 }}
            />
          ))}
        </div>
      )}

      <div style={{
        flex: 1,
        minHeight: 0,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.025)',
        overflow: 'hidden',
        display: 'flex',
      }}>
        {/* Line-number gutter */}
        <div
          ref={gutterRef}
          aria-hidden
          style={{
            flexShrink: 0,
            overflow: 'hidden',
            userSelect: 'none',
            width: `calc(${digitCount}ch + 20px)`,
            fontFamily: '"Roboto Mono", "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.7',
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingRight: '8px',
            textAlign: 'right',
            color: 'rgba(128,128,128,0.5)',
            borderRight: '1px solid rgba(128,128,128,0.2)',
            backgroundColor: 'rgba(0,0,0,0.03)',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              style={n === errorLine ? { color: 'var(--euiColorDanger, #e74c3c)', fontWeight: 600 } : undefined}
            >
              {n}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          onScroll={syncGutter}
          value={value}
          onChange={handleChange}
          spellCheck={false}
          aria-label="SIGMA rule YAML"
          style={{
            flex: 1,
            height: '100%',
            fontFamily: '"Roboto Mono", "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.7',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'inherit',
            padding: '10px 12px',
            boxSizing: 'border-box',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            overflowY: 'auto',
          }}
        />
      </div>
    </EuiPanel>
  );
};
