const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android icon sizes
const sizes = [
  { name: 'mdpi', size: 48 },
  { name: 'hdpi', size: 72 },
  { name: 'xhdpi', size: 96 },
  { name: 'xxhdpi', size: 144 },
  { name: 'xxxhdpi', size: 192 }
];

const sourceImage = path.join(__dirname, 'app-logo.png');
const androidResPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

async function generateIcons() {
  console.log('Starting icon generation...');

  for (const { name, size } of sizes) {
    const outputDir = path.join(androidResPath, `mipmap-${name}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'ic_launcher.png');

    try {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} icon (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name} icon:`, error.message);
    }
  }

  // Also generate round icons
  console.log('\nGenerating round icons...');
  for (const { name, size } of sizes) {
    const outputDir = path.join(androidResPath, `mipmap-${name}`);
    const outputPath = path.join(outputDir, 'ic_launcher_round.png');

    try {
      // Create a circular mask
      const circularMask = Buffer.from(
        `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`
      );

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .composite([{
          input: circularMask,
          blend: 'dest-in'
        }])
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} round icon (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name} round icon:`, error.message);
    }
  }

  console.log('\n✅ Icon generation complete!');
}

generateIcons().catch(console.error);
