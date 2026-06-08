"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const StatusPage_1 = require("./StatusPage");
// Parse a GitHub URL (including tree/blob URLs) or owner/repo shorthand.
// https://github.com/SigmaHQ/sigma/tree/master/rules-threat-hunting
//   → owner=SigmaHQ, repo=sigma, branch=master, rulesPath=rules-threat-hunting/
function parseGitHubInput(input) {
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
    if (urlMatch)
        return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    // Shorthand: owner/repo
    const shortMatch = s.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (shortMatch)
        return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
}
function newId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
const EMPTY_FORM = { url: '', name: '', branch: '', rulesPath: 'rules/' };
async function detectDefaultBranch(owner, repo) {
    var _a;
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'babel-kibana-plugin' },
        });
        if (!res.ok)
            return 'main';
        const data = await res.json();
        return (_a = data.default_branch) !== null && _a !== void 0 ? _a : 'main';
    }
    catch {
        return 'main';
    }
}
const SettingsModal = ({ onClose, apiService }) => {
    const [repos, setRepos] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [showStatus, setShowStatus] = (0, react_1.useState)(false);
    const [form, setForm] = (0, react_1.useState)(EMPTY_FORM);
    const [formError, setFormError] = (0, react_1.useState)(null);
    const [saveError, setSaveError] = (0, react_1.useState)(null);
    const [isDetectingBranch, setIsDetectingBranch] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        apiService.getRepos().then(res => {
            if (res.success && res.data)
                setRepos(res.data.repos);
        }).catch(() => { }).finally(() => setIsLoading(false));
    }, [apiService]);
    const handleUrlBlur = (0, react_1.useCallback)(async () => {
        const parsed = parseGitHubInput(form.url);
        if (!parsed)
            return;
        // Pre-fill rulesPath from the URL if provided
        if (parsed.rulesPath && !form.rulesPath) {
            setForm(f => ({ ...f, rulesPath: parsed.rulesPath }));
        }
        // Auto-detect branch: use URL-extracted branch, or fetch default from GitHub API
        if (parsed.branch) {
            setForm(f => ({ ...f, branch: parsed.branch }));
        }
        else if (!form.branch) {
            setIsDetectingBranch(true);
            const detected = await detectDefaultBranch(parsed.owner, parsed.repo);
            setIsDetectingBranch(false);
            setForm(f => ({ ...f, branch: f.branch || detected }));
        }
    }, [form.url, form.branch, form.rulesPath]);
    const handleAdd = (0, react_1.useCallback)(() => {
        setFormError(null);
        const parsed = parseGitHubInput(form.url);
        if (!parsed) {
            setFormError('Enter a GitHub URL (https://github.com/owner/repo) or owner/repo shorthand.');
            return;
        }
        const branch = form.branch.trim() || parsed.branch || 'main';
        const rulesPath = (form.rulesPath.trim() || parsed.rulesPath || 'rules/');
        const normalizedPath = rulesPath.replace(/\/?$/, '/');
        const displayName = form.name.trim() || `${parsed.owner}/${parsed.repo} (${normalizedPath.replace(/\/$/, '')})`;
        const already = repos.some(r => {
            const p = parseGitHubInput(r.url);
            return (p === null || p === void 0 ? void 0 : p.owner) === parsed.owner && (p === null || p === void 0 ? void 0 : p.repo) === parsed.repo && r.branch === branch && r.rulesPath === normalizedPath;
        });
        if (already) {
            setFormError('This repository + branch + path combination is already configured.');
            return;
        }
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
    const handleRemove = (0, react_1.useCallback)((id) => {
        setRepos(prev => prev.filter(r => r.id !== id));
    }, []);
    const handleToggle = (0, react_1.useCallback)((id) => {
        setRepos(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    }, []);
    const handleSave = (0, react_1.useCallback)(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await apiService.saveRepos(repos);
            onClose();
        }
        catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to save');
        }
        finally {
            setIsSaving(false);
        }
    }, [apiService, repos, onClose]);
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiModal, { onClose: onClose, style: { minWidth: 560 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiModalHeader, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiModalHeaderTitle, { children: "Settings" }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiModalBody, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h4", { children: "GitHub Repositories" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "xs" }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", children: (0, jsx_runtime_1.jsx)("p", { children: "Configure repositories to sync SIGMA rules from. Any public GitHub repository with YAML rule files works \u2014 not just SigmaHQ." }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), isLoading ? ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, {}) }) })) : repos.length === 0 ? ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { color: "subdued", size: "s", textAlign: "center", children: (0, jsx_runtime_1.jsx)("p", { children: "No repositories configured. Add one below." }) })) : (repos.map(repo => ((0, jsx_runtime_1.jsx)(eui_1.EuiPanel, { hasBorder: true, hasShadow: false, paddingSize: "s", style: { marginBottom: 8 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { alignItems: "center", gutterSize: "s", responsive: false, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", children: (0, jsx_runtime_1.jsx)("strong", { children: repo.name }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: [repo.url, " \u00A0", (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "hollow", children: repo.branch }), "\u00A0", (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "hollow", children: repo.rulesPath })] })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSwitch, { label: "", checked: repo.enabled, onChange: () => handleToggle(repo.id), compressed: true }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiButtonIcon, { "aria-label": "Remove repository", iconType: "trash", color: "danger", size: "s", onClick: () => handleRemove(repo.id) }) })] }) }, repo.id)))), (0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "m" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xxs", children: (0, jsx_runtime_1.jsx)("h5", { children: "Add Repository" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "GitHub URL or owner/repo", isInvalid: !!formError, error: formError !== null && formError !== void 0 ? formError : undefined, fullWidth: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { fullWidth: true, placeholder: "https://github.com/SigmaHQ/sigma/tree/master/rules  or  SigmaHQ/sigma", value: form.url, onChange: e => { setForm(f => ({ ...f, url: e.target.value })); setFormError(null); }, onBlur: handleUrlBlur }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Display name (optional)", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { placeholder: "e.g. SigmaHQ Official", value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })) }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 140 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Branch", helpText: isDetectingBranch ? 'Detecting…' : undefined, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { placeholder: isDetectingBranch ? 'detecting…' : 'e.g. master', value: form.branch, isLoading: isDetectingBranch, onChange: e => setForm(f => ({ ...f, branch: e.target.value })) }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 140 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Rules path", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { placeholder: "e.g. rules/", value: form.rulesPath, onChange: e => setForm(f => ({ ...f, rulesPath: e.target.value })) }) }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { size: "s", iconType: "plusInCircle", onClick: handleAdd, children: "Add Repository" }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, {}), (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { onClick: () => setShowStatus(s => !s), iconType: "gear", size: "s", children: "Integration & Status" }), showStatus && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, {}), (0, jsx_runtime_1.jsx)(StatusPage_1.StatusPage, { apiService: apiService })] })), saveError && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: saveError, color: "danger", iconType: "error", size: "s" })] }))] }), (0, jsx_runtime_1.jsxs)(eui_1.EuiModalFooter, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiButtonEmpty, { onClick: onClose, children: "Cancel" }), (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { fill: true, onClick: handleSave, isLoading: isSaving, children: "Save" })] })] }));
};
exports.SettingsModal = SettingsModal;
//# sourceMappingURL=SettingsModal.js.map