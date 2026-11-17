import express from 'express';
import {errorHandler,notFound} from './middleware/error-handler.js';
import {requestContext} from './middleware/request-context.js';
import {createHealthRouter} from './routes/health.js';
import {createAuthRouter} from './routes/auth.js';
import {authenticate} from './middleware/authenticate.js';
import {createCustomerRouter} from './routes/customers.js';
import {createDeviceRouter} from './routes/devices.js';
import {createRepairOrderRouter} from './routes/repair-orders.js';
import {createInventoryRouter} from './routes/inventory.js';
import {createReportRouter} from './routes/reports.js';
import {createRepairLogRouter} from './routes/repair-logs.js';
import {createPartsRequestRouter} from './routes/parts-requests.js';
import {createCustomerPortalRouter} from './routes/customer-portal.js';
import {createInvoiceRouter} from './routes/invoices.js';
import {createUserRouter} from './routes/users.js';
import {createNotificationRouter} from './routes/notifications.js';
export function createApp({db}){const app=express();app.disable('x-powered-by');app.use(express.json({limit:'15mb'}));app.use(requestContext);app.use(createHealthRouter(db));app.use(createAuthRouter(db));app.use('/api/v1',authenticate(db));app.use(createCustomerRouter(db));app.use(createCustomerPortalRouter(db));app.use(createUserRouter(db));app.use(createDeviceRouter(db));app.use(createRepairOrderRouter(db));app.use('/api/v1/repair-orders/:orderId/logs',createRepairLogRouter(db));app.use(createPartsRequestRouter(db));app.use(createInvoiceRouter(db));app.use(createInventoryRouter(db));app.use(createReportRouter(db));app.use(createNotificationRouter({db}));app.use(notFound);app.use(errorHandler);return app;}
