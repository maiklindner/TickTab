const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const KEY_PATH = '/Users/maik/Documents/GitHub/Extension-Conventions/keys/gen-lang-client-0215910193-063beb19bcc9.json';
const client = new textToSpeech.TextToSpeechClient({ keyFilename: KEY_PATH });

const sampleTexts = {
  'de-DE': 'Hallo, ich bin eine der Stimmen für FeeFier. Wie gefalle ich dir?',
  'en-US': 'Hello, I am one of the voices for FeeFier. Do you like my sound?',
  'ja-JP': 'こんにちは、FeeFierの音声の一つです。私の声はいかがですか？',
  'es-ES': 'Hola, soy una de las voces de FeeFier. ¿Te gusta cómo sueno?',
  'fr-FR': "Bonjour, je suis l'une des voix de FeeFier. Comment me trouves-tu ?",
  'pt-BR': 'Olá, eu sou uma das vozes do FeeFier. O que você acha do meu som?',
  'zh-CN': '你好，我是 FeeFier 的声音之一。你觉得我的声音怎么样？'
};

const ssmlFeeFier = '<speak><phoneme alphabet="ipa" ph="fiːfaɪər">FeeFier</phoneme></speak>';

async function listVoices(langCode) {
  const [result] = await client.listVoices({ languageCode: langCode });
  return result.voices.filter(v => 
    v.name.includes('Neural2') || 
    v.name.includes('Studio') || 
    v.name.includes('Polyglot') ||
    v.name.includes('Wavenet')
  );
}

async function generateSample(text, voiceName, langCode, outputPath) {
  console.log(`Generating sample: ${voiceName}...`);
  const request = {
    input: { text },
    voice: { languageCode: langCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
  } catch (err) {
    console.error(`Error for ${voiceName}:`, err.message);
  }
}

async function run() {
  const baseDir = path.join(__dirname, 'voice_samples');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

  const langs = ['de-DE', 'en-US', 'ja-JP', 'es-ES', 'fr-FR', 'pt-BR', 'zh-CN'];

  for (const lang of langs) {
    console.log(`\nExploring voices for ${lang}...`);
    const voices = await listVoices(lang);
    const langDir = path.join(baseDir, lang);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir);

    for (const voice of voices) {
      const outputPath = path.join(langDir, `${voice.name}.mp3`);
      if (fs.existsSync(outputPath)) continue;

      // We use a combination of the sample text and the branded name check
      const text = sampleTexts[lang].replace('FeeFier', 'FeeFier'); 
      // Note: We could use SSML here too if we want to test the phoneme sync
      await generateSample(text, voice.name, lang, outputPath);
    }
  }
  console.log('\nAll samples generated in scripts/promo/voice_samples/');
}

run();
