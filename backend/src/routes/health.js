import {Router} from 'express';
export function createHealthRouter(db){const router=Router();router.get('/health',(_req,res)=>res.status(200).json({status:'ok'}));router.get('/api/v1/health',async(_req,res,next)=>{try{await db.query('SELECT 1 AS healthy');res.status(200).json({status:'ok',dependencies:{database:'ok'}});}catch(error){next(error);}});return router;}
