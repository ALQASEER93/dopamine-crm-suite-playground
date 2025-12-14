const bcrypt = require('bcryptjs');
const { User } = require('../models');

(async () => {
  const email = 'admin@example.com';
  const newPass = 'Admin@12345'; // غيّرها إذا بدك
  const passwordHash = await bcrypt.hash(newPass, 10);

  const [count] = await User.update({ passwordHash }, { where: { email } });
  console.log('updated users:', count, 'NEW_PASSWORD:', newPass);
  process.exit(0);
})();
