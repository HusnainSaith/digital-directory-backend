import { applyDecorators } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

export function ApiFile(fieldName: string = 'file') {
  return applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

export function ApiFileWithFields(fieldName: string = 'file', additionalFields?: Record<string, any>) {
  const properties: any = {
    [fieldName]: {
      type: 'string',
      format: 'binary',
    },
  };
  
  if (additionalFields) {
    Object.assign(properties, additionalFields);
  }

  return applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        properties,
      },
    }),
  );
}
