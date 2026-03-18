import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCountry = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const country = request.country;
    return data ? country?.[data] : country;
  },
);
