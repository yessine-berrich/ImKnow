import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadType } from 'utils/types';


export const CurrentPayload = createParamDecorator(

  (data: unknown, context: ExecutionContext): JwtPayloadType => {
    const request = context.switchToHttp().getRequest();
    const payload: JwtPayloadType = request.user;
    return payload;
  },
);
