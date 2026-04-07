import {
  ExecutionContext, 
  NestInterceptor, 
  CallHandler, 
  Injectable
} from "@nestjs/common"
import { Observable } from "rxjs";
import {tap} from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor{
  intercept(
    context: ExecutionContext, 
    next: CallHandler
  ): Observable<any> {    
    console.log('interceptou a requisicao');

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    //console.log(`[REQUEST] ${method} ${url}... inicio da req`);
    return next.handle().pipe(
        tap(() => {
            console.log(
              `[response] ${method} ${url}... ${Date.now() - now}ms`
            );  
        })
    )
  }
}