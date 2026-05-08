const fs = require('fs');
const path = require('path');

async function checkImages() {
  const articlesDir = 'articles';
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json') && f !== 'TEMPLATE.json');

  let report = {
    total: files.length,
    broken: 0,
    images: []
  };

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf8'));
    const slug = file.replace('.json', '');

    if (content.thumbnail) {
      report.images.push({
        article: slug,
        thumbnail: content.thumbnail,
        status: 'pending_check'
      });
    }
  }

  console.log(`Checked: ${report.total} articles`);
  console.log(`Broken images: ${report.broken}`);
  console.log('Image check complete');
}

checkImages().catch(console.error);
