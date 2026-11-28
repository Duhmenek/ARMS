import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';

const rl = readline.createInterface({ input:stdin, output:stdout });
async function hidden(question) {
  stdout.write(question);
  rl.pause();
  stdin.setRawMode?.(true);
  stdin.resume();
  return new Promise(resolve => {
    let value='';
    const onData=buffer=>{
      const key=buffer.toString();
      if(key==='\r'||key==='\n'){stdin.off('data',onData);stdin.setRawMode?.(false);rl.resume();stdout.write('\n');resolve(value);}
      else if(key==='\u0003'){process.exit(1);}
      else if(key==='\u007f'){value=value.slice(0,-1);}
      else value+=key;
    };
    stdin.on('data',onData);
  });
}
async function provision(role, defaults, title) {
  const existing=db.prepare('SELECT id FROM users WHERE role=?').get(role);
  if(existing){console.log(`${title} account already exists; leaving it unchanged.`);return;}
  const username=(await rl.question(`${title} username [${defaults.username}]: `)).trim()||defaults.username;
  const email=(await rl.question(`${title} local email [${defaults.email}]: `)).trim()||defaults.email;
  const name=(await rl.question(`${title} display name [${defaults.name}]: `)).trim()||defaults.name;
  const password=await hidden(`${title} password (12+ characters): `);
  if(password.length<12) throw new Error('Passwords must contain at least 12 characters.');
  db.prepare('INSERT INTO users(id,username,email,full_name,password_hash,role,role_title,department) VALUES(?,?,?,?,?,?,?,?)')
    .run(crypto.randomUUID(),username.toLowerCase(),email.toLowerCase(),name,bcrypt.hashSync(password,12),role,title,title==='Management'?'Archive Management':'Archive Custody');
  console.log(`${title} account created.`);
}
try {
  await provision('management',{username:'management',email:'management@local',name:'Archive Management'},'Management');
  await provision('custodian',{username:'custodian',email:'custodian@local',name:'Archive Custodian'},'Custodian');
  console.log('User setup complete. No records or logs were created.');
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { rl.close(); db.close(); }
