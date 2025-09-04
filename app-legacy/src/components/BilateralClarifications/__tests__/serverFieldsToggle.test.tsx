import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock AuthContext to provide a logged-in user
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { user: { id: 'user-1' } } })
}));

// Mock service layer
jest.mock('../../../services/bilateralClarificationService', () => ({
  bilateralClarificationService: {
    getClarifications: jest.fn(),
    getStatistics: jest.fn(),
  }
}));

// Prevent heavy children from rendering side effects
jest.mock('../ClarificationsList', () => ({ ClarificationsList: () => null }));
jest.mock('../ClarificationsBoard', () => ({ ClarificationsBoard: () => null }));
jest.mock('../WorkflowDemoTab', () => ({ WorkflowDemoTab: () => null }));
jest.mock('../ClarificationFilters', () => ({ ClarificationFilters: () => null }));

describe.skip('serverFields toggle behavior', () => {
  const sample = [{ id: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'DRAFT', marketPartner: { companyName: 'X', code: '1' } }];

  it('does NOT call deriveAll when serverFields.enabled = true', async () => {
    // Set window override before module import
    (window as any).__FEATURE_FLAGS__ = { serverFields: { enabled: true } };
    jest.resetModules();

    // Import modules in isolation so they pick up the override
    const { default: Page } = await import('../BilateralClarificationsPage');
    const svcMod = await import('../../../services/bilateralClarificationService');
    const deriveMod = await import('../clarificationDerive');

    const svc: any = svcMod.bilateralClarificationService as any;
    svc.getClarifications.mockReset();
    svc.getStatistics.mockReset();
    svc.getClarifications.mockResolvedValue({ clarifications: sample, pagination: { total: 1 }, summary: { totalOpen: 1, overdueCases: 0, totalResolved: 0, totalClosed: 0 } });
    svc.getStatistics.mockResolvedValue({});

    const spy = jest.spyOn(deriveMod, 'deriveAll');
    render(<Page />);
    await waitFor(() => {});
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls deriveAll when serverFields.enabled = false', async () => {
    // Disable server fields via window override
    (window as any).__FEATURE_FLAGS__ = { serverFields: { enabled: false } };
    jest.resetModules();

    const { default: Page } = await import('../BilateralClarificationsPage');
    const svcMod = await import('../../../services/bilateralClarificationService');
    const deriveMod = await import('../clarificationDerive');

    const svc: any = svcMod.bilateralClarificationService as any;
    svc.getClarifications.mockReset();
    svc.getStatistics.mockReset();
    svc.getClarifications.mockResolvedValue({ clarifications: sample, pagination: { total: 1 }, summary: { totalOpen: 1, overdueCases: 0, totalResolved: 0, totalClosed: 0 } });
    svc.getStatistics.mockResolvedValue({});

    const spy = jest.spyOn(deriveMod, 'deriveAll');
    render(<Page />);
    await waitFor(() => {});
    expect(spy).toHaveBeenCalled();
  });
});
