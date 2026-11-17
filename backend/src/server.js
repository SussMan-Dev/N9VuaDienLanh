import {createApp} from './app.js';
import {env} from './config/env.js';
import {createPool} from './db/pool.js';
import {log} from './lib/logger.js';
const db=createPool(env.db);const app=createApp({db});let server;
async function start(){await db.query('SELECT 1 AS healthy');server=app.listen(env.port,()=>log('info','server_started',{port:env.port,environment:env.nodeEnv}));}
async function shutdown(signal){log('info','shutdown_started',{signal});if(server)await new Promise((resolve)=>server.close(resolve));await db.end();log('info','shutdown_complete',{signal});}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>shutdown(signal).then(()=>process.exit(0)).catch((error)=>{log('error','shutdown_failed',{message:error.message});process.exit(1);}));
start().catch(async(error)=>{log('error','startup_failed',{message:error.message});await db.end();process.exit(1);});
