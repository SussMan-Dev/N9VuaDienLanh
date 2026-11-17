import 'dotenv/config';
const required=['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD'];
const missing=required.filter((key)=>!process.env[key]);
if(missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
function positive(value,name,fallback){const parsed=Number.parseInt(value??fallback,10);if(!Number.isInteger(parsed)||parsed<=0)throw new Error(`${name} must be a positive integer`);return parsed;}
const nodeEnv=process.env.NODE_ENV??'development';
if(!['development','test','production'].includes(nodeEnv))throw new Error('NODE_ENV must be development, test, or production');
export const env=Object.freeze({nodeEnv,port:positive(process.env.PORT,'PORT','3000'),db:Object.freeze({host:process.env.DB_HOST,port:positive(process.env.DB_PORT,'DB_PORT','3306'),name:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionLimit:positive(process.env.DB_CONNECTION_LIMIT,'DB_CONNECTION_LIMIT','10')})});
