import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversionPanel } from './ConversionPanel';
import { TestRunResult, ClusterHitsResult } from '../types';

const BASE_PROPS = {
  format: 'eql',
  onFormatChange: jest.fn(),
  result: 'sequence by host.name\n  [process where process.name == "cmd.exe"]',
  error: null,
  isConverting: false,
  pipeline: 'ecs_windows',
  hasRule: true,
  onTestRun: jest.fn(),
  testRunResult: null,
  testRunError: null,
  isTestRunning: false,
  onDeploy: jest.fn(),
  deployResult: null,
  deployError: null,
  isDeploying: false,
  clusterHitsResult: null,
  clusterHitsError: null,
  isClusteringHits: false,
  onClusterHits: jest.fn(),
};

describe('ConversionPanel — backtest button visibility', () => {
  it('shows Backtest button for eql format when result is present', () => {
    render(<ConversionPanel {...BASE_PROPS} format="eql" />);
    screen.getByRole('button', { name: /backtest/i });
  });

  it('shows Backtest button for es-qs format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="es-qs" />);
    screen.getByRole('button', { name: /backtest/i });
  });

  it('does not show Backtest button for esql format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="esql" />);
    expect(screen.queryByRole('button', { name: /backtest/i })).toBeNull();
  });

  it('does not show Backtest button for dsl_lucene format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="dsl_lucene" />);
    expect(screen.queryByRole('button', { name: /backtest/i })).toBeNull();
  });

  it('does not show Backtest button for kibana_ndjson format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="kibana_ndjson" />);
    expect(screen.queryByRole('button', { name: /backtest/i })).toBeNull();
  });

  it('does not show Backtest button when result is null', () => {
    render(<ConversionPanel {...BASE_PROPS} result={null} />);
    expect(screen.queryByRole('button', { name: /backtest/i })).toBeNull();
  });

  it('does not show Backtest button when hasRule is false', () => {
    render(<ConversionPanel {...BASE_PROPS} hasRule={false} />);
    expect(screen.queryByRole('button', { name: /backtest/i })).toBeNull();
  });
});

describe('ConversionPanel — backtest panel toggle', () => {
  it('clicking Backtest reveals the Run button', () => {
    render(<ConversionPanel {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByRole('button', { name: /^run$/i });
  });

  it('clicking Backtest a second time hides the panel', () => {
    render(<ConversionPanel {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByRole('button', { name: /^run$/i });
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull();
  });

  it('clicking Run calls onTestRun with default index and timeframe', () => {
    const onTestRun = jest.fn();
    render(<ConversionPanel {...BASE_PROPS} onTestRun={onTestRun} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }));
    expect(onTestRun).toHaveBeenCalledTimes(1);
    expect(onTestRun).toHaveBeenCalledWith(
      expect.objectContaining({ indexPattern: '*', timeframeHours: 24 })
    );
  });

  it('shows Run button while test is running', () => {
    render(<ConversionPanel {...BASE_PROPS} isTestRunning />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByRole('button', { name: /^run$/i });
  });
});

describe('ConversionPanel — backtest results', () => {
  const result: TestRunResult = {
    test_run_id: 'run-123',
    hit_count: 7,
    sample_events: [],
    timing_ms: 142,
  };

  it('shows hit count badge after a successful run', () => {
    render(<ConversionPanel {...BASE_PROPS} testRunResult={result} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByText(/7 hits/i);
  });

  it('shows timing badge after a successful run', () => {
    render(<ConversionPanel {...BASE_PROPS} testRunResult={result} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByText(/142ms/i);
  });

  it('shows Cluster hits button when hit count > 0', () => {
    render(<ConversionPanel {...BASE_PROPS} testRunResult={result} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByRole('button', { name: /cluster hits/i });
  });

  it('does not show Cluster hits button when hit count is 0', () => {
    const zeroResult = { ...result, hit_count: 0 };
    render(<ConversionPanel {...BASE_PROPS} testRunResult={zeroResult} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    expect(screen.queryByRole('button', { name: /cluster hits/i })).toBeNull();
  });

  it('shows error message when testRunError is set', () => {
    render(<ConversionPanel {...BASE_PROPS} testRunError="Elasticsearch unreachable" />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByText(/Elasticsearch unreachable/i);
  });

  it('calls onClusterHits with the test run ID when Cluster hits is clicked', () => {
    const onClusterHits = jest.fn();
    render(<ConversionPanel {...BASE_PROPS} testRunResult={result} onClusterHits={onClusterHits} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    fireEvent.click(screen.getByRole('button', { name: /cluster hits/i }));
    expect(onClusterHits).toHaveBeenCalledWith('run-123');
  });
});

describe('ConversionPanel — cluster hits results', () => {
  const testResult: TestRunResult = {
    test_run_id: 'run-abc',
    hit_count: 5,
    sample_events: [],
    timing_ms: 80,
  };
  const clusterResult: ClusterHitsResult = {
    test_run_id: 'run-abc',
    total_hits: 5,
    clusters: [
      { field: 'process.name', buckets: [{ value: 'cmd.exe', count: 4 }, { value: 'powershell.exe', count: 1 }] },
    ],
  };

  it('renders field name from cluster result', () => {
    render(
      <ConversionPanel
        {...BASE_PROPS}
        testRunResult={testResult}
        clusterHitsResult={clusterResult}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByText('process.name');
  });

  it('renders bucket values from cluster result', () => {
    render(
      <ConversionPanel
        {...BASE_PROPS}
        result="sequence by host.name [process where process.name == 'svchost.exe']"
        testRunResult={testResult}
        clusterHitsResult={clusterResult}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByText(/cmd\.exe/);
    screen.getByText(/powershell\.exe/);
  });
});

describe('ConversionPanel — deploy button', () => {
  it('shows Deploy button for eql format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="eql" />);
    screen.getByRole('button', { name: /deploy/i });
  });

  it('does not show Deploy button for elastalert format', () => {
    render(<ConversionPanel {...BASE_PROPS} format="elastalert" />);
    expect(screen.queryByRole('button', { name: /deploy/i })).toBeNull();
  });

  it('opening Deploy panel closes Backtest panel', () => {
    render(<ConversionPanel {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /backtest/i }));
    screen.getByRole('button', { name: /^run$/i });
    fireEvent.click(screen.getByRole('button', { name: /deploy/i }));
    expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull();
    screen.getByRole('button', { name: /create detection rule/i });
  });
});
