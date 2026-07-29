import { toRelativeApiPath, normalizeApiPath } from '@/shared/api/urlUtils';

describe('toRelativeApiPath', () => {
  it.each([
    ['/location/report', '/location/report'],
    ['/api/v1/location/report', '/location/report'],
    ['http://localhost:8092/api/v1/location/report', '/location/report'],
    ['/api/v1/http://localhost:8092/api/v1/location/report', '/location/report'],
    [
      '/api/v1/http://localhost:8092/api/v1/http:/localhost:8092/api/v1/location/report',
      '/location/report',
    ],
    ['api/v1/location/report', '/location/report'],
    ['location/report', '/location/report'],
    ['/location/report?x=1', '/location/report?x=1'],
  ])('%s → %s', (input, expected) => {
    expect(toRelativeApiPath(input)).toBe(expected);
  });
});

describe('normalizeApiPath', () => {
  it('returns lowercase path without leading slash', () => {
    expect(normalizeApiPath('/api/v1/Location/Report')).toBe('location/report');
  });
});
