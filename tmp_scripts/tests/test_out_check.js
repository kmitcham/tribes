const { execSync } = require('child_process');
try {
  execSync('npm test tests/reproduction.test.js', { stdio: 'pipe' });
  console.log("PASS");
} catch (err) {
  console.log(err.stderr.toString());
}
