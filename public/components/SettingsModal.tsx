import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSwitch,
  EuiCallOut,
  EuiBadge,
} from '@elastic/eui';
import { ApiService, SigmaRepo } from '../services/api';
import { StatusPage } from './StatusPage';

interface ParsedRepo {
  owner: string;
  repo: string;
  branch?: string;
  rulesPath?: string;
}

// Parse a GitHub URL (including tree/blob URLs) or owner/repo shorthand.
// https://github.com/SigmaHQ/sigma/tree/master/rules-threat-hunting
//   → owner=SigmaHQ, repo=sigma, branch=master, rulesPath=rules-threat-hunting/
function parseGitHubInput(input: string): ParsedRepo | null {
  const s = input.trim();
  // Tree URL with path: github.com/owner/repo/tree/branch/path
  const treeMatch = s.match(/github\.com\/([^/\s]+)\/([^/\s]+)\/tree\/([^/\s]+)(?:\/(.+?))?(?:\s*$)/);
  if (treeMatch) {
    return {
      owner: treeMatch[1],
      repo: treeMatch[2].replace(/\.git$/, ''),
      branch: treeMatch[3],
      rulesPath: treeMatch[4] ? treeMatch[4].replace(/\/?$/, '/') : 'rules/',
    };
  }
  // Plain repo URL: github.com/owner/repo
  const urlMatch = s.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  // Shorthand: owner/repo
  const shortMatch = s.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface SettingsModalProps {
  onClose: () => void;
  apiService: ApiService;
}

const EMPTY_FORM = { url: '', name: '', branch: '', rulesPath: 'rules/' };

async function detectDefaultBranch(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'babel-kibana-plugin' },
    });
    if (!res.ok) return 'main';
    const data = await res.json();
    return data.default_branch ?? 'main';
  } catch {
    return 'main';
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, apiService }) => {
  const [repos, setRepos] = useState<SigmaRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDetectingBranch, setIsDetectingBranch] = useState(false);

  useEffect(() => {
    apiService.getRepos().then(res => {
      if (res.success && res.data) setRepos(res.data.repos);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [apiService]);

  const handleUrlBlur = useCallback(async () => {
    const parsed = parseGitHubInput(form.url);
    if (!parsed) return;
    // Pre-fill rulesPath from the URL if provided
    if (parsed.rulesPath && !form.rulesPath) {
      setForm(f => ({ ...f, rulesPath: parsed.rulesPath! }));
    }
    // Auto-detect branch: use URL-extracted branch, or fetch default from GitHub API
    if (parsed.branch) {
      setForm(f => ({ ...f, branch: parsed.branch! }));
    } else if (!form.branch) {
      setIsDetectingBranch(true);
      const detected = await detectDefaultBranch(parsed.owner, parsed.repo);
      setIsDetectingBranch(false);
      setForm(f => ({ ...f, branch: f.branch || detected }));
    }
  }, [form.url, form.branch, form.rulesPath]);

  const handleAdd = useCallback(() => {
    setFormError(null);
    const parsed = parseGitHubInput(form.url);
    if (!parsed) {
      setFormError('Enter a GitHub URL (https://github.com/owner/repo) or owner/repo shorthand.');
      return;
    }
    const branch    = form.branch.trim()    || parsed.branch    || 'main';
    const rulesPath = (form.rulesPath.trim() || parsed.rulesPath || 'rules/');
    const normalizedPath = rulesPath.replace(/\/?$/, '/');
    const displayName = form.name.trim() || `${parsed.owner}/${parsed.repo} (${normalizedPath.replace(/\/$/, '')})`;
    const already = repos.some(r => {
      const p = parseGitHubInput(r.url);
      return p?.owner === parsed.owner && p?.repo === parsed.repo && r.branch === branch && r.rulesPath === normalizedPath;
    });
    if (already) { setFormError('This repository + branch + path combination is already configured.'); return; }

    setRepos(prev => [...prev, {
      id: newId(),
      name: displayName,
      url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      branch,
      rulesPath: normalizedPath,
      enabled: true,
    }]);
    setForm(EMPTY_FORM);
  }, [form, repos]);

  const handleRemove = useCallback((id: string) => {
    setRepos(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setRepos(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiService.saveRepos(repos);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [apiService, repos, onClose]);

  return (
    <EuiModal onClose={onClose} style={{ minWidth: 560 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Settings</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {/* ── Repositories section ── */}
        <EuiTitle size="xs"><h4>GitHub Repositories</h4></EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            Configure repositories to sync SIGMA rules from. Any public GitHub repository
            with YAML rule files works — not just SigmaHQ.
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {/* Repo list */}
        {isLoading ? (
          <EuiFlexGroup justifyContent="center"><EuiFlexItem grow={false}><EuiLoadingSpinner /></EuiFlexItem></EuiFlexGroup>
        ) : repos.length === 0 ? (
          <EuiText color="subdued" size="s" textAlign="center">
            <p>No repositories configured. Add one below.</p>
          </EuiText>
        ) : (
          repos.map(repo => (
            <EuiPanel key={repo.id} hasBorder hasShadow={false} paddingSize="s" style={{ marginBottom: 8 }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{repo.name}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {repo.url} &nbsp;
                    <EuiBadge color="hollow">{repo.branch}</EuiBadge>
                    &nbsp;
                    <EuiBadge color="hollow">{repo.rulesPath}</EuiBadge>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label=""
                    checked={repo.enabled}
                    onChange={() => handleToggle(repo.id)}
                    compressed
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label="Remove repository"
                    iconType="trash"
                    color="danger"
                    size="s"
                    onClick={() => handleRemove(repo.id)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ))
        )}

        <EuiHorizontalRule margin="m" />

        {/* Add repo form */}
        <EuiTitle size="xxs">
          <h5>Add Repository</h5>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFormRow label="GitHub URL or owner/repo" isInvalid={!!formError} error={formError ?? undefined} fullWidth>
          <EuiFieldText
            fullWidth
            placeholder="https://github.com/SigmaHQ/sigma/tree/master/rules  or  SigmaHQ/sigma"
            value={form.url}
            onChange={e => { setForm(f => ({ ...f, url: e.target.value })); setFormError(null); }}
            onBlur={handleUrlBlur}
          />
        </EuiFormRow>

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow label="Display name (optional)">
              <EuiFieldText
                placeholder="e.g. SigmaHQ Official"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 140 }}>
            <EuiFormRow label="Branch" helpText={isDetectingBranch ? 'Detecting…' : undefined}>
              <EuiFieldText
                placeholder={isDetectingBranch ? 'detecting…' : 'e.g. master'}
                value={form.branch}
                isLoading={isDetectingBranch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 140 }}>
            <EuiFormRow label="Rules path">
              <EuiFieldText
                placeholder="e.g. rules/"
                value={form.rulesPath}
                onChange={e => setForm(f => ({ ...f, rulesPath: e.target.value }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiButton size="s" iconType="plusInCircle" onClick={handleAdd}>
          Add Repository
        </EuiButton>

        <EuiSpacer />
        <EuiButton onClick={() => setShowStatus(s => !s)} iconType="gear" size="s">
          Integration & Status
        </EuiButton>

        {showStatus && (
          <>
            <EuiSpacer />
            <StatusPage apiService={apiService} />
          </>
        )}

        {saveError && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title={saveError} color="danger" iconType="error" size="s" />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton fill onClick={handleSave} isLoading={isSaving}>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
