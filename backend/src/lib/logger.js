export function log(level,event,fields={}){const output=JSON.stringify({timestamp:new Date().toISOString(),level,event,...fields});if(level==='error')console.error(output);else console.log(output);}
