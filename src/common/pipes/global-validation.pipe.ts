import {
  BadRequestException,
  Injectable,
  ValidationPipe,
  ArgumentMetadata,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validateCustomDecorators: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = this.formatErrors(errors);
        return new BadRequestException(messages);
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // Skip validation for custom decorators (like @CurrentUser)
    if (metadata.type === 'custom') {
      return value;
    }
    
    // Skip validation for file uploads (multer file objects)
    if (value && value.buffer && value.mimetype && value.originalname) {
      return value;
    }
    
    // Skip validation for multipart/form-data without DTO
    if (metadata.type === 'body' && !metadata.metatype) {
      return value;
    }
    
    // Skip validation if there's no type to validate against
    if (!metadata.metatype || !this.shouldValidate(metadata)) {
      return value;
    }
    
    return super.transform(value, metadata);
  }

  private shouldValidate(metadata: ArgumentMetadata): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metadata.metatype);
  }

  private formatErrors(errors: ValidationError[]): string[] {
    const errorMessages: string[] = [];
    
    const extractErrors = (validationErrors: ValidationError[], parentPath = '') => {
      validationErrors.forEach((error) => {
        const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
        
        if (error.constraints) {
          Object.values(error.constraints).forEach((message) => {
            errorMessages.push(`${propertyPath}: ${message}`);
          });
        }
        
        if (error.children && error.children.length > 0) {
          extractErrors(error.children, propertyPath);
        }
      });
    };
    
    extractErrors(errors);
    return errorMessages;
  }
}
