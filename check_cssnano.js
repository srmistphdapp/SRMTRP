const fs = require('fs');
const glob = require('glob');
const postcss = require('postcss');
const cssnano = require('cssnano');

glob("src/**/*.css", async (err, files) => {
  if (err) throw err;
  for (let file of files) {
    const css = fs.readFileSync(file, 'utf8');
    try {
      await postcss([cssnano]).process(css, { from: file });
    } catch (e) {
      console.error(`ERROR IN ${file}: ${e.message}`);
    }
  }
});
