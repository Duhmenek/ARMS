import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';

const role=process.argv[2];
if(!['management','custodian'].includes(role)){console.error('Usage: npm run reset:user -- management|custodian');process.exit(1);}
function readHidden(question){
  if(!stdin.isTTY||typeof stdin.setRawMode!=='function')throw new Error('Run this command in an interactive terminal so the password can be entered securely.');
  stdout.write(question);stdin.setRawMode(true);stdin.resume();let value='';
  return new Promise(resolve=>{
    const onData=buffer=>{const key=buffer.toString();if(key==='\r'||key==='\n'){stdin.off('data',onData);stdin.setRawMode(false);stdout.write('\n');resolve(value);}else if(key==='\u0003'){process.exit(1);}else if(key==='\u007f'){value=value.slice(0,-1);}else value+=key;};
    stdin.on('data',onData);
  });
}
try{
  const password=await readHidden('New password (12+ characters; input hidden): ');
  if(password.length<12)throw new Error('Passwords must contain at least 12 characters.');
  const result=db.prepare('UPDATE users SET password_hash=? WHERE role=?').run(bcrypt.hashSync(password,12),role);
  if(!result.changes)throw new Error(`No ${role} account exists.`);
  db.prepare('DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE role=?)').run(role);
  console.log(`${role} password updated. Existing sessions were revoked.`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{db.close();}
