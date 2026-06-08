import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { SigmaRule, IrPhase } from '../types';

interface VisualEditorProps {
  rule: SigmaRule | null;
  onChange: (patch: Partial<SigmaRule>) => void;
}

const STATUS_OPTIONS = [
  { value: '', text: '— select —' },
  { value: 'stable', text: 'stable' },
  { value: 'test', text: 'test' },
  { value: 'experimental', text: 'experimental' },
  { value: 'deprecated', text: 'deprecated' },
];

const LEVEL_OPTIONS = [
  { value: '', text: '— select —' },
  { value: 'critical', text: 'critical' },
  { value: 'high', text: 'high' },
  { value: 'medium', text: 'medium' },
  { value: 'low', text: 'low' },
  { value: 'informational', text: 'informational' },
];

const IR_PHASE_OPTIONS = [
  { value: '', text: '— none —' },
  { value: 'preparation',   text: 'Preparation' },
  { value: 'detection',     text: 'Detection' },
  { value: 'containment',   text: 'Containment' },
  { value: 'eradication',   text: 'Eradication' },
  { value: 'recovery',      text: 'Recovery' },
  { value: 'post-incident', text: 'Post-Incident' },
];

export const VisualEditor: React.FC<VisualEditorProps> = ({ rule, onChange }) => {
  if (!rule) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="s" style={{ height: '100%' }}>
        <EuiTitle size="xs">
          <h3>Visual Editor</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>Fix YAML errors to enable visual editing.</p>
        </EuiText>
      </EuiPanel>
    );
  }

  const logsource = (rule.logsource as Record<string, string>) ?? {};
  const tags: string[] = Array.isArray(rule.tags) ? (rule.tags as string[]) : [];

  const patchLogsource = (field: string, value: string) =>
    onChange({ logsource: { ...logsource, [field]: value } });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      style={{ height: '100%', overflowY: 'auto' }}
    >
      <EuiTitle size="xs">
        <h3>Visual Editor</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiForm component="div">

        <EuiFormRow label="Title" fullWidth>
          <EuiFieldText
            fullWidth
            value={(rule.title as string) ?? ''}
            onChange={e => onChange({ title: e.target.value })}
          />
        </EuiFormRow>

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow label="Status" fullWidth>
              <EuiSelect
                fullWidth
                options={STATUS_OPTIONS}
                value={(rule.status as string) ?? ''}
                onChange={e => onChange({ status: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Level" fullWidth>
              <EuiSelect
                fullWidth
                options={LEVEL_OPTIONS}
                value={(rule.level as string) ?? ''}
                onChange={e => onChange({ level: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFormRow label="Description" fullWidth>
          <EuiTextArea
            fullWidth
            rows={3}
            resize="vertical"
            value={(rule.description as string) ?? ''}
            onChange={e => onChange({ description: e.target.value })}
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="s" />
        <EuiTitle size="xxs">
          <h4 style={{ color: 'var(--euiColorMediumShade, #69707d)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Log Source</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow label="Category">
              <EuiFieldText
                value={logsource.category ?? ''}
                onChange={e => patchLogsource('category', e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Product">
              <EuiFieldText
                value={logsource.product ?? ''}
                onChange={e => patchLogsource('product', e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Service">
              <EuiFieldText
                value={logsource.service ?? ''}
                onChange={e => patchLogsource('service', e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />
        <EuiFormRow label="Tags" fullWidth helpText="Press Enter to add a tag">
          <EuiComboBox
            fullWidth
            noSuggestions
            selectedOptions={tags.map(t => ({ label: t }))}
            onChange={opts => onChange({ tags: opts.map(o => o.label) })}
            onCreateOption={tag =>
              onChange({ tags: [...tags, tag] })
            }
          />
        </EuiFormRow>

        <EuiFormRow
          label="IR Phase"
          fullWidth
          helpText="NIST IR lifecycle phase this rule supports"
        >
          <EuiSelect
            fullWidth
            options={IR_PHASE_OPTIONS}
            value={(rule['x-ir-phase'] as string) ?? ''}
            onChange={e =>
              onChange({ 'x-ir-phase': (e.target.value as IrPhase) || undefined })
            }
          />
        </EuiFormRow>

      </EuiForm>
    </EuiPanel>
  );
};
