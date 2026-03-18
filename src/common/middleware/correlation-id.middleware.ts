import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include correlationId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || uuidv4();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Log incoming request with correlation ID
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '-';

    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.log(
        `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${ip} - ${userAgent}`,
      );
    });

    next();
  }
}
