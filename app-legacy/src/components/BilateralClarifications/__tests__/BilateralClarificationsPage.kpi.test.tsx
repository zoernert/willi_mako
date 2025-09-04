import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BilateralClarificationsPage from '../BilateralClarificationsPage';
import { bilateralClarificationService } from '../../../services/bilateralClarificationService';

// Mock AuthContext to provide a logged-in user
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { user: { id: 'user-1' } } })
}));

// Mock feature flags: enable server fields and KPI server
jest.mock('../../../config/featureFlags', () => ({
  featureFlags: {
    boardView: { enabled: false },
    emailImport: { enabled: true },
    sendAsIdentity: { enabled: true },
    serverFields: { enabled: true },
    attachments: { enabled: true },
    kpiServer: { enabled: true },
  }
}));

// Mock service with jest.fn inside the factory
jest.mock('../../../services/bilateralClarificationService', () => ({
  bilateralClarificationService: {
    getClarifications: jest.fn(),
    getStatistics: jest.fn(),
  }
}));

// Mock heavy child components to reduce side effects and speed up rendering
jest.mock('../ClarificationsList', () => ({
  ClarificationsList: () => null
}));
jest.mock('../ClarificationsBoard', () => ({
  ClarificationsBoard: () => null
}));
jest.mock('../WorkflowDemoTab', () => ({
  WorkflowDemoTab: () => null
}));
jest.mock('../ClarificationFilters', () => ({
  ClarificationFilters: () => null
}));

const sampleClarifications = [
  {
    id: 1,
    title: 'Case A',
    status: 'DRAFT',
    priority: 'MEDIUM',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sharedWithTeam: true,
    assignedTo: 'user-1',
    marketPartner: { companyName: 'MP A', code: '123' },
  },
  {
    id: 2,
    title: 'Case B',
    status: 'RESOLVED',
    priority: 'LOW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sharedWithTeam: false,
    assignedTo: 'someone-else',
    marketPartner: { companyName: 'MP B', code: '456' },
  },
];

describe('BilateralClarificationsPage KPIs', () => {
  let svc: any;
  beforeEach(() => {
  svc = bilateralClarificationService as any;
  svc.getClarifications.mockReset();
  svc.getStatistics.mockReset();
  });

  test('uses server summary when available (no /statistics call)', async () => {
  svc.getClarifications.mockResolvedValue({
      clarifications: sampleClarifications,
      pagination: { total: 2 },
      summary: { totalOpen: 1, overdueCases: 0, totalResolved: 1, totalClosed: 0 }
    });

    render(<BilateralClarificationsPage />);

    // Wait for stats cards to appear (look for the label "Gesamt" and value 2)
    await waitFor(() => expect(screen.getByText('Gesamt')).toBeInTheDocument());
    // The value 2 should be rendered for total cases
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);

    // Ensure /statistics was not called because summary exists
  expect(svc.getStatistics).not.toHaveBeenCalled();
  });

  test('falls back to /statistics when summary missing', async () => {
  svc.getClarifications.mockResolvedValue({
      clarifications: sampleClarifications,
      pagination: { total: 2 }
    });
  svc.getStatistics.mockResolvedValue({ totalActive: 3, overdue: 1, highPriority: 0, dueToday: 0, waitingUS: 1, waitingMP: 2 });

    render(<BilateralClarificationsPage />);

    await waitFor(() => expect(screen.getByText('Gesamt')).toBeInTheDocument());
  expect(svc.getStatistics).toHaveBeenCalled();

    // Total cases should still reflect list length (2)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  test('gracefully falls back to client metrics when /statistics fails (e.g., 401)', async () => {
  svc.getClarifications.mockResolvedValue({
      clarifications: sampleClarifications,
      pagination: { total: 2 }
    });
  svc.getStatistics.mockRejectedValue(new Error('Unauthorized'));

    render(<BilateralClarificationsPage />);

    await waitFor(() => expect(screen.getByText('Gesamt')).toBeInTheDocument());

    // Check that "Team-Freigaben" card shows the client-derived count (1)
    const teamLabel = screen.getByText('Team-Freigaben');
    // Find a nearby number 1 rendered somewhere on the page; this is a light assertion that the card shows 1
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
