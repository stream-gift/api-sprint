export interface SolanaStatusResponse {
  page: {
    updated_at: string;
  };
  status: {
    indicator: 'none' | 'minor' | 'major' | 'critical';
    description:
      | 'All Systems Operational'
      | 'Partial System Outage'
      | 'Major Service Outage';
  };
}
