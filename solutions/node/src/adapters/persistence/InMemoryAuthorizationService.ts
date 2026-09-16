import type { AuthorizationService } from '../../charging/application/ports.ts';

// Local whitelist: the site must keep authorizing when HQ is unreachable (§1.1).
export class InMemoryAuthorizationService implements AuthorizationService {
  private readonly known: Set<string>;
  constructor(validTags: string[] = ['TAG-MONTHLY-77']) {
    this.known = new Set(validTags);
  }
  async isAuthorized(idTag: string): Promise<boolean> {
    return this.known.has(idTag);
  }
}
