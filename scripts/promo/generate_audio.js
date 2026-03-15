const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const locales = require('./locales.json').locales;

// PATHS
const textToSpeech = require('@google-cloud/text-to-speech');
const KEY_PATH = '/Users/maik/Documents/GitHub/Extension-Conventions/keys/gen-lang-client-0215910193-063beb19bcc9.json';
const client = new textToSpeech.TextToSpeechClient({ keyFilename: KEY_PATH });

async function generateAudio(text, voiceName, langCode, outputPath, force = false, isSsml = false) {
  if (!force && fs.existsSync(outputPath)) {
    console.log(`Skipping (already exists): ${path.basename(outputPath)}`);
    return;
  }

  console.log(`Generating high-quality audio for: "${text.substring(0, 30)}..." (${langCode})${isSsml ? ' [SSML]' : ''}`);
  
  const request = {
    input: isSsml ? { ssml: text } : { text },
    voice: { languageCode: langCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.0 },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    const tempPath = outputPath + '.raw.mp3';
    fs.writeFileSync(tempPath, response.audioContent, 'binary');
    
    // MANDATORY PREMIUM SILENCE STRIPPING
    const silRemove = `ffmpeg -y -i "${tempPath}" -af "silenceremove=start_periods=1:start_threshold=-60dB:stop_periods=1:stop_duration=0.5:stop_threshold=-60dB" "${outputPath}"`;
    try {
      execSync(silRemove, { stdio: 'ignore' });
      fs.unlinkSync(tempPath);
    } catch (e) {
      console.warn(`FFmpeg silenceremove failed for ${outputPath}, using raw file.`);
      fs.renameSync(tempPath, outputPath);
    }
    console.log(`Saved (stripped): ${outputPath}`);
  } catch (err) {
    console.error(`Error generating audio for ${langCode}:`, err);
    throw err;
  }
}

const crypto = require('crypto');

async function run() {
  const outputDir = path.resolve(__dirname, '../../assets/store/audio');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const force = process.argv.includes('--force');
  const targetLocales = ['en', 'de', 'ja', 'es', 'fr', 'pt_BR', 'zh_CN'];

  for (const lang of targetLocales) {
    const localeData = locales[lang];
    if (!localeData) continue;
    
    // Extract lang code (e.g., 'en-US', 'pt-BR') from voice name or fallback to flag
    let langCode = localeData.voice.split('-').slice(0, 2).join('-') || localeData.flag.replace('--lang=', '');
    if (langCode === 'zh-CN') langCode = 'cmn-CN';
    
    const script = localeData.script;
    for (let i = 0; i < script.length; i++) {
        let text = script[i];
        let isSsml = false;

        // MANDATORY PREMIUM PHONATION
        if (text === 'TickTab') {
            const ipa = 'tɪk tæb';
            text = `<speak><phoneme alphabet="ipa" ph="${ipa}">TickTab</phoneme></speak>`;
            isSsml = true;
        }

        // Standardized hashing including voice to avoid cross-voice cache contamination
        const hashInput = text + localeData.voice + (isSsml ? '_ssml' : '');
        const hash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);
        const outputPath = path.join(outputDir, `vo_${lang}_${i}_${hash}.mp3`);
        await generateAudio(text, localeData.voice, langCode, outputPath, force, isSsml);
    }
  }
}

run();
