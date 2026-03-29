const { exec } = require('child_process');
exec('npm test tests/reproduction.test.js', (err, stdout, stderr) => {
   console.log(stderr);
});
