import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CountriesService } from '../../modules/countries/countries.service';

// Extend Express Request to include country
declare global {
  namespace Express {
    interface Request {
      country?: {
        id: string;
        code: string;
        name: string;
        subdomain: string;
      };
    }
  }
}

// Subdomains to skip (not country subdomains)
const SKIP_SUBDOMAINS = new Set(['www', 'admin', 'api', 'localhost']);

@Injectable()
export class CountryResolutionMiddleware implements NestMiddleware {
  constructor(private readonly countriesService: CountriesService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const host = req.headers.host || '';
    const appDomain = process.env.APP_DOMAIN || 'yourdirectory.com';

    // Extract subdomain: e.g., "south-korea.yourdirectory.com" → "south-korea"
    let subdomain: string | null = null;

    if (host.includes(appDomain)) {
      const parts = host.replace(`:${process.env.PORT || '3001'}`, '').split('.');
      // If we have more parts than the domain itself, the first part is the subdomain
      const domainParts = appDomain.split('.').length;
      if (parts.length > domainParts) {
        subdomain = parts[0];
      }
    } else if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      // In dev: check X-Country-Subdomain header for testing
      subdomain = req.headers['x-country-subdomain'] as string || null;
    }

    // Skip certain subdomains
    if (!subdomain || SKIP_SUBDOMAINS.has(subdomain)) {
      return next();
    }

    // Resolve country from subdomain
    const country = await this.countriesService.findBySubdomain(subdomain);

    if (!country) {
      throw new NotFoundException(`Country not found for subdomain: ${subdomain}`);
    }

    // Attach country to request
    req.country = {
      id: country.id,
      code: country.countryCode,
      name: country.name,
      subdomain: country.subdomain,
    };

    next();
  }
}
