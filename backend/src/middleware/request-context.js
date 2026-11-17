import {randomUUID} from 'node:crypto';
import {log} from '../lib/logger.js';
export function requestContext(req,res,next){req.requestId=req.get('x-request-id')||randomUUID();res.setHeader('x-request-id',req.requestId);const started=process.hrtime.bigint();res.on('finish',()=>log('info','http_request',{requestId:req.requestId,method:req.method,path:req.originalUrl,status:res.statusCode,durationMs:Number((Number(process.hrtime.bigint()-started)/1e6).toFixed(2))}));next();}
