const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'fonts');
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const regUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf';
  const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf';

  const regPath = path.join(FONTS_DIR, 'Poppins-Regular.ttf');
  const boldPath = path.join(FONTS_DIR, 'Poppins-Bold.ttf');

  console.log('Downloading Poppins-Regular.ttf...');
  await downloadFile(regUrl, regPath);
  console.log('Saved Poppins-Regular.ttf (bytes:', fs.statSync(regPath).size, ')');

  console.log('Downloading Poppins-Bold.ttf...');
  await downloadFile(boldUrl, boldPath);
  console.log('Saved Poppins-Bold.ttf (bytes:', fs.statSync(boldPath).size, ')');

  console.log('Fonts downloaded successfully!');
}

main().catch(err => {
  console.error('Download error:', err);
  process.exit(1);
});
