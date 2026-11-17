import mysql from 'mysql2/promise';
export function createPool(db){return mysql.createPool({host:db.host,port:db.port,database:db.name,user:db.user,password:db.password,waitForConnections:true,connectionLimit:db.connectionLimit,queueLimit:0,timezone:'Z',decimalNumbers:true});}
