const fs = require('fs');
const glob = require('glob');
const postcss = require('postcss');

glob("src/**/*.css", async (err, files) => {
  if (err) throw err;
  for (let file of files) {
    const css = fs.readFileSync(file, 'utf8');
    try {
      postcss.parse(css);
    } catch (e) {
      console.error(`ERROR IN ${file}: ${e.message}`);
    }
  }
});
