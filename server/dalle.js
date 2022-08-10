const { generateImage } = require('dalle');

async function generate(prompt) {
  let dataURI;
  try {
    dataURI = await generateImage(prompt, { gridSize: 2 });
  } catch (e) {
    console.log(e);
  }
  return dataURI;
}

module.exports = {
  generate,
};
