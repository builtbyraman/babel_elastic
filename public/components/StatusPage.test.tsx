import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StatusPage } from './StatusPage';

describe('StatusPage', () => {
  it('renders service health cards from API response', async () => {
    const apiService = {
      getStatus: jest.fn().mockResolvedValue({
        services: [
          { name: 'Sigma Conversion API', status: 'ok', latency_ms: 120 },
          { name: 'Elasticsearch', status: 'ok', latency_ms: 50 },
        ],
        errors: [],
      }),
      getDataSources: jest.fn().mockResolvedValue({ sources: [] }),
      getRepos: jest.fn().mockResolvedValue({ data: { repos: [] } }),
    } as any;

    render(<StatusPage apiService={apiService} />);

    await waitFor(() => screen.getByText('Sigma Conversion API'));
    screen.getByText('Elasticsearch');
    screen.getByText('Integration & Status');
  });

  it('shows data source summary when sources are returned', async () => {
    const apiService = {
      getStatus: jest.fn().mockResolvedValue({ services: [], errors: [] }),
      getDataSources: jest.fn().mockResolvedValue({
        sources: [
          { product: 'windows', label: 'Windows', available: true, index_count: 3, doc_count: 1000, indices: [], categories: [] },
          { product: 'linux', label: 'Linux', available: false, index_count: 0, doc_count: 0, indices: [], categories: [] },
        ],
      }),
      getRepos: jest.fn().mockResolvedValue({ data: { repos: [] } }),
    } as any;

    render(<StatusPage apiService={apiService} />);

    await waitFor(() => screen.getByText('Data Sources'));
    screen.getByText('Windows');
    screen.getByText('Linux');
  });

  it('shows down status badge when a service is down', async () => {
    const apiService = {
      getStatus: jest.fn().mockResolvedValue({
        services: [{ name: 'Sigma Conversion API', status: 'down', latency_ms: null }],
        errors: [],
      }),
      getDataSources: jest.fn().mockResolvedValue({ sources: [] }),
      getRepos: jest.fn().mockResolvedValue({ data: { repos: [] } }),
    } as any;

    render(<StatusPage apiService={apiService} />);

    await waitFor(() => screen.getByText('down'));
  });

  it('shows Active and No data panels when sources present', async () => {
    const apiService = {
      getStatus: jest.fn().mockResolvedValue({ services: [], errors: [] }),
      getDataSources: jest.fn().mockResolvedValue({
        sources: [
          { product: 'windows', label: 'Windows', available: true, index_count: 1, doc_count: 500, indices: [], categories: [] },
          { product: 'aws', label: 'AWS', available: false, index_count: 0, doc_count: 0, indices: [], categories: [] },
        ],
      }),
      getRepos: jest.fn().mockResolvedValue({ data: { repos: [] } }),
    } as any;

    render(<StatusPage apiService={apiService} />);

    await waitFor(() => screen.getByText('Active'));
    screen.getByText('No data');
  });
});
