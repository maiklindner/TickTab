const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const locales = require('./locales.json').locales;
const crypto = require('crypto');

function getVoPath(audioDir, localeKey, index, text) {
    const localeData = locales[localeKey];
    const voice = localeData ? localeData.voice : '';
    let finalInput = text;
    let isSsml = false;

    // MANDATORY PREMIUM PHONATION
    if (text === 'TickTab') {
        const ipa = 'tɪk tæb';
        finalInput = `<speak><phoneme alphabet="ipa" ph="${ipa}">TickTab</phoneme></speak>`;
        isSsml = true;
    }

    const hashInput = finalInput + voice + (isSsml ? '_ssml' : '');
    const hash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);
    return path.join(audioDir, `vo_${localeKey}_${index}_${hash}.mp3`);
}

async function recordPromo(localeKey) {
    const localeData = locales[localeKey];
    if (!localeData) return;

    console.log(`\n--- Recording TickTab Promo: ${localeKey.toUpperCase()} ---`);
    const finalDir = path.resolve(__dirname, '../../assets/store/video');
    const audioDir = path.resolve(__dirname, '../../assets/store/audio');
    const tempDir = path.join(__dirname, 'temp');
    
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const videoPath = path.join(tempDir, `video_${localeKey}.mp4`);
    const finalPath = path.join(finalDir, `promo_${localeKey}.mp4`);
    const music = path.join(__dirname, 'assets/mklr_music.mp3');

    const extensionPath = path.resolve('../../src');
    
    if (fs.existsSync(videoPath)) {
        console.log(`Raw video already exists at ${videoPath}. Skipping recording phase.`);
    } else {
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                `--window-size=1280,820`,
                `--enable-gpu`,
                `--use-angle`
            ]
        });

        const page = await browser.newPage();
        page.on('error', err => console.error('Page error:', err));
        page.on('pageerror', err => console.error('Page script error:', err));
        await page.setViewport({ width: 1280, height: 720 });

        // Wait for extension to load
        await new Promise(r => setTimeout(r, 2000));
        const targets = await browser.targets();
        const extensionTarget = targets.find(t => t.url().startsWith('chrome-extension://'));
        if (!extensionTarget) {
            console.error('Extension ID not found!');
            await browser.close();
            return;
        }
        const extensionId = extensionTarget.url().split('/')[2];
        const optionsUrl = `chrome-extension://${extensionId}/options.html`;

        const recorder = new PuppeteerScreenRecorder(page, {
            fps: 60,
            width: 1280,
            height: 720,
        });

        // --- FLASH FIX: Initialize Language before recording ---
        console.log(`Initializing language: ${localeKey}`);
        await page.goto(optionsUrl, { waitUntil: 'networkidle2' });
        await page.evaluate((lang) => {
            return new Promise((resolve) => {
                chrome.storage.sync.set({ language: lang }, () => {
                    resolve();
                });
            });
        }, localeKey);
        await page.waitForTimeout(500);

        // Start Intro
        await page.goto('about:blank');
        await page.evaluate(() => {
            document.body.style.margin = '0';
            document.body.style.background = 'white';
            document.body.style.display = 'flex';
            document.body.style.justifyContent = 'center';
            document.body.style.alignItems = 'center';
            document.body.style.height = '100vh';
            
            const logo = document.createElement('img');
            logo.id = 'intro-logo';
            logo.style.width = '240px';
            logo.style.height = '240px';
            logo.style.opacity = '0';
            logo.style.transform = 'rotate(-180deg) scale(0.5)';
            logo.style.transition = 'all 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            document.body.appendChild(logo);
        });

        console.log('Recording started...');
        await recorder.start(videoPath);
        const recStartTime = Date.now();
        
        const waitToMark = async (targetSeconds) => {
            const elapsed = (Date.now() - recStartTime) / 1000;
            const remaining = targetSeconds - elapsed;
            if (remaining > 0) {
                await page.waitForTimeout(remaining * 1000);
            }
        };
        const logoBase64 = fs.readFileSync(path.join(extensionPath, 'icons/logo300.png'), { encoding: 'base64' });
        await page.evaluate((b64) => {
            const img = document.getElementById('intro-logo');
            img.src = `data:image/png;base64,${b64}`;
            setTimeout(() => { 
                img.style.opacity = '1'; 
                img.style.transform = 'rotate(0deg) scale(1)';
            }, 100);
        }, logoBase64);
        
        await waitToMark(2); // Ensure Intro finishes at 2s
        
        // Navigate to Options
        await page.goto(optionsUrl, { waitUntil: 'networkidle2' });

        try {
            // --- 2-10s: Phase 1 (Master Toggle) ---
            console.log('Phase 1: Master Toggle Interaction');
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
            
            await page.waitForSelector('.slider');
            await page.waitForTimeout(1000);
            await page.click('.slider'); // Turn OFF
            await page.waitForTimeout(1500);
            await page.click('.slider'); // Turn ON
            await page.waitForTimeout(2500);
            await waitToMark(10); // Phase 1 must end at 10s

            // --- 10-18s: Phase 2 (Time Presets & Custom) ---
            console.log('Phase 2: Adjusting Expiration Timer');
            await page.select('#timeSelect', 'custom');
            await page.waitForTimeout(1000);
            
            await page.waitForSelector('#customMinutes');
            await page.click('#customMinutes', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            
            // Final safety: direct value reset
            await page.$eval('#customMinutes', el => el.value = '');
            await page.waitForTimeout(300);
            
            await page.type('#customMinutes', '30', { delay: 100 });
            await page.select('#unitSelect', '1'); // Minutes
            
            await page.waitForTimeout(1000);
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
            await page.waitForTimeout(4000);
            await waitToMark(18); // Phase 2 must end at 18s

            // --- 18-30s: Phase 3 Overlay & 24s Sync Outro ---
            console.log('Phase 3: Overlay & 24s Sync Outro');
            await page.evaluate((features, brandName, b64) => {
                const overlay = document.createElement('div');
                overlay.id = 'promo-overlay-final';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    backdrop-filter: blur(15px); background: rgba(0,0,0,0.4);
                    display: flex; flex-direction: column; justify-content: center;
                    align-items: center; color: white; border: none;
                    z-index: 2147483647; transition: opacity 0.5s;
                    text-align: center; padding: 40px; box-sizing: border-box;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                `;
                overlay.innerHTML = `<div id="text-wrapper" style="width: 80%; display: flex; flex-direction: column; justify-content: center; align-items: center;"><div id="feature-title" style="font-size: min(10vw, 4.2rem); font-weight: 900; line-height: 1.2; transition: all 0.4s ease-out; opacity: 0; transform: translateY(20px); text-shadow: 0 4px 30px rgba(0,0,0,0.5);"></div></div>`;
                document.documentElement.appendChild(overlay);
                
                const container = document.getElementById('feature-title');
                const wrapper = document.getElementById('text-wrapper');
                const showFeature = (idx) => {
                    if (idx < features.length && idx < 3) {
                        container.innerText = features[idx];
                        container.style.opacity = '1';
                        container.style.transform = 'translateY(0)';
                        setTimeout(() => {
                            container.style.opacity = '0';
                            container.style.transform = 'translateY(-10px)';
                            setTimeout(() => showFeature(idx + 1), 400);
                        }, 1500);
                    }
                };
                showFeature(0);

                setTimeout(() => {
                    wrapper.innerHTML = '';
                    const logo = document.createElement('img');
                    logo.src = `data:image/png;base64,${b64}`;
                    logo.style.width = '280px';
                    logo.style.height = '280px';
                    logo.style.marginBottom = '20px';
                    logo.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    logo.style.transform = 'scale(0.8) translateY(20px)';
                    logo.style.opacity = '0';
                    
                    const title = document.createElement('h1');
                    title.innerText = brandName;
                    title.style.fontSize = 'min(15vw, 8rem)';
                    title.style.fontWeight = '600';
                    title.style.letterSpacing = '-0.02em';
                    title.style.color = 'white'; 
                    title.style.margin = '0';
                    title.style.opacity = '0';
                    title.style.transition = 'all 0.8s ease-out';
                    title.style.transform = 'translateY(10px) scale(1.05)';
                    
                    wrapper.appendChild(logo);
                    wrapper.appendChild(title);
                    setTimeout(() => {
                        logo.style.opacity = '1';
                        logo.style.transform = 'scale(1) translateY(0)';
                        title.style.opacity = '1';
                        title.style.transform = 'translateY(0) scale(1.1)'; 
                    }, 100);
                }, 6000);
            }, localeData.features, localeData.script[localeData.script.length - 1], logoBase64);
            
            await page.waitForTimeout(12000);

        } finally {
            await recorder.stop();
            await browser.close();
        }
    }

    // Safe Gaps: 2.5, 7.5, 12.0, 17.5, 25.0 (Branding at 25s)
    const offsets = [2.5, 7.5, 12.0, 17.5, 25.0];
    const masterGain = 2.0;

    let filterComplex = `[1:a]volume=0.8[bg_music];`;
    let voMixInputStr = '';
    for (let i = 0; i < localeData.script.length; i++) {
        const delay = Math.round(offsets[i] * 1000);
        filterComplex += `[${i + 2}:a]adelay=${delay}|${delay}[v${i}];`;
        voMixInputStr += `[v${i}]`;
    }
    filterComplex += `${voMixInputStr}amix=inputs=${localeData.script.length}:normalize=0:dropout_transition=0,volume=${masterGain * localeData.script.length}[allvo_raw];`;
    filterComplex += `[allvo_raw]asplit=2[allvo_duck][allvo_mix];`;
    filterComplex += `[bg_music][allvo_duck]sidechaincompress=threshold=0.1:ratio=20:release=200:attack=15[ducked];`;
    filterComplex += `[ducked][allvo_mix]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[final_audio]`;

    const voInputs = localeData.script.map((text, i) => `-i "${getVoPath(audioDir, localeKey, i, text)}"`).join(' ');
    const cmd = `ffmpeg -y -i "${videoPath}" -i "${music}" ${voInputs} -filter_complex "${filterComplex}" -map 0:v -map "[final_audio]" -c:v libx264 -pix_fmt yuv420p -r 60 -b:a 192k -ar 44100 "${finalPath}"`;

    try { execSync(cmd); console.log(`Final video saved: ${finalPath}`); } 
    catch (err) { console.error('FFmpeg error:', err.message); }
}

async function run() {
    const targetLocales = ['en', 'de', 'ja', 'es', 'fr', 'pt_BR', 'zh_CN'];
    for (const key of targetLocales) { await recordPromo(key); }
}

run();
