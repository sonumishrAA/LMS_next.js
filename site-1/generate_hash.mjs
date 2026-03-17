import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.log('Usage: node generate_hash.mjs <your_new_password>');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log('-------------------------------------------');
console.log('NEW PASSWORD HASH:');
console.log(hash);
console.log('-------------------------------------------');
