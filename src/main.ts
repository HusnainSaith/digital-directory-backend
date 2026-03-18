import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/global-validation.pipe';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';

function getAllowedOrigins() {
  // FRONTEND_URLS as comma-separated list
  const list = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Add your API/Swagger and frontend domains explicitly
  // (adjust these to your real domains)
  const extra = [
    'https://adminapi.labverse.org', // API+Swagger origin
    'http://localhost:3000', // Local dev
    'http://localhost:3001', // Next.js dev server
    'https://labverse.org',
    'https://www.labverse.org',
  ];
  for (const e of extra) if (!list.includes(e)) list.push(e);
  return list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Raw body parser for Stripe webhooks (must be before other parsers)
  app.use(
    '/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': ["'self'", 'data:', 'https:'],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );

  // Permissions-Policy header
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(self)',
    );
    next();
  });

  // Explicit body size limits
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Compression middleware
  app.use(compression());

  const allowed = getAllowedOrigins();
  const subdomainPattern = /^https?:\/\/[a-z0-9-]+\.(labverse\.org|localhost:\d+)$/;
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      // Allow subdomain-based origins (e.g. ae.labverse.org, sa.labverse.org)
      if (subdomainPattern.test(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Country-Subdomain',
    exposedHeaders: 'Authorization',
    maxAge: 86400, // Cache preflight requests for 24 hours
  });

  // Global validation pipe with strict validation
  app.useGlobalPipes(new GlobalValidationPipe());

  // Swagger documentation with proper bearer auth configuration
  const config = new DocumentBuilder()
    .setTitle('Digital Business Directory API')
    .setDescription('Complete project management and CRM system API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
