process.env.JEST_USE_REAL_TIMERS = 'true';
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const timers = require('timers');

let browser;
let browserContext;
let page;
let serverProcess;
let originalRegistry;

const SERVER_PORT = 18000 + (process.pid % 1000);
const APP_URL = `http://127.0.0.1:${SERVER_PORT}`;
const TEST_TRIBE_NAME = 'unit-test-tribe';
const TEST_TRIBE_DIR = path.resolve(__dirname, '..', 'tribe-data', TEST_TRIBE_NAME);
const TEST_TRIBE_STATE_PATH = path.join(TEST_TRIBE_DIR, `${TEST_TRIBE_NAME}.json`);
const TEST_TRIBE_FIXTURE_PATH = path.resolve(__dirname, 'browser-integration-tribe.json');
const TRIBES_REGISTRY_PATH = path.resolve(__dirname, '..', 'tribe-data', 'tribesRegistry.json');

async function loginAs(playerName, tribe = TEST_TRIBE_NAME, password = '') {
    await page.goto(APP_URL);
    await page.waitForSelector('#playerName');

    await page.select('#tribeSelect', tribe);
    await page.type('#playerName', playerName);
    if (password) {
        await page.type('#playerPassword', password);
    }

    await page.click('#registerBtn');
    await page.waitForSelector('#commandList');
    await page.waitForFunction(() => {
        return (
            window.tribesClient &&
            window.tribesClient.currentPopulation &&
            window.tribesClient.currentChildren &&
            document.querySelectorAll('#commandList .command-item').length > 0
        );
    });
}

async function openCommand(commandName) {
    const commands = await page.$$('#commandList .command-item');
    for (const item of commands) {
        const text = await page.evaluate((el) => el.textContent, item);
        if (text.toLowerCase().includes(commandName.toLowerCase())) {
            await item.click();
            await page.waitForSelector('#commandModal.active');
            return;
        }
    }

    throw new Error(`Command not found in UI: ${commandName}`);
}

async function getPlayerGuarding(playerName) {
    return page.evaluate((currentPlayerName) => {
        const population = window.tribesClient?.currentPopulation || {};
        const player =
            population[currentPlayerName] ||
            Object.values(population).find((person) => person.name === currentPlayerName);
        return Array.isArray(player?.guarding) ? [...player.guarding] : [];
    }, playerName);
}

beforeAll(async () => {
    global.setTimeout = timers.setTimeout;
    global.setInterval = timers.setInterval;
    global.clearTimeout = timers.clearTimeout;
    global.clearInterval = timers.clearInterval;

    originalRegistry = fs.readFileSync(TRIBES_REGISTRY_PATH, 'utf8');

    fs.mkdirSync(TEST_TRIBE_DIR, { recursive: true });
    fs.writeFileSync(
        TEST_TRIBE_STATE_PATH,
        fs.readFileSync(TEST_TRIBE_FIXTURE_PATH, 'utf8')
    );

    const registry = JSON.parse(originalRegistry);
    registry[TEST_TRIBE_NAME] = { name: TEST_TRIBE_NAME, hidden: false };
    fs.writeFileSync(TRIBES_REGISTRY_PATH, JSON.stringify(registry, null, 2));

    
    await new Promise((resolve, reject) => {
        const customEnv = { ...process.env, PORT: SERVER_PORT, NODE_ENV: 'development' };
        delete customEnv.JEST_WORKER_ID;
        
        serverProcess = spawn('node', ['websocket-server.js'], {
            env: customEnv,
            cwd: path.resolve(__dirname, '..')
        });

        serverProcess.stdout.on('data', data => {
            const str = data.toString();
            if (str.includes('started on port')) {
                resolve();
            }
        });
        
        serverProcess.stderr.on('data', data => {
            console.error(`SERVER ERROR: ${data.toString()}`);
        });

        serverProcess.on('exit', code => {
            if (code !== 0 && code !== null) {
                console.log(`SERVER EXITED with code ${code}`);
            }
            reject(new Error(`Server exited early with code ${code}`));
        });
        
        setTimeout(() => reject(new Error('Server start timeout')), 5000);
    });

    browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
}, 10000);

beforeEach(async () => {
    if (typeof browser.createIncognitoBrowserContext === 'function') {
        browserContext = await browser.createIncognitoBrowserContext();
    } else {
        browserContext = await browser.createBrowserContext();
    }
    page = await browserContext.newPage();
});

afterEach(async () => {
    if (page) {
        await page.close();
        page = null;
    }
    if (browserContext) {
        await browserContext.close();
        browserContext = null;
    }
});

afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
        try {
            serverProcess.kill();
        } catch (e) {
            console.log('Error killing server:', e);
        }
    }
    if (originalRegistry !== undefined) {
        fs.writeFileSync(TRIBES_REGISTRY_PATH, originalRegistry);
    }
    fs.rmSync(TEST_TRIBE_DIR, { recursive: true, force: true });
});

describe('Browser Integration: tribes-interface.html', () => {
    test('status update renders conflict banner for demand and violence', async () => {
        await loginAs('eggplant');

        const demandState = {
            round: 'reproduction',
            workRound: false,
            foodRound: false,
            reproductionRound: true,
            seasonCounter: 8,
            currentLocationName: 'marsh',
            year: 4,
            startStamp: 'test-stamp',
            demand: 'share fish',
            violence: null
        };

        await page.evaluate((state) => {
            window.tribesClient.handleMessage({
                type: 'infoRequest',
                label: 'status',
                content: 'status',
                gameState: state
            });
        }, demandState);

        await page.waitForSelector('#conflictBanner.active');
        let bannerState = await page.evaluate(() => ({
            title: document.getElementById('conflictBannerTitle').textContent,
            body: document.getElementById('conflictBannerBody').textContent,
            isViolence: document.getElementById('conflictBanner').classList.contains('violence')
        }));

        expect(bannerState.title).toBe('Demand Active');
        expect(bannerState.body).toContain('share fish');
        expect(bannerState.isViolence).toBe(false);

        const violenceState = { ...demandState, violence: 'share fish' };
        await page.evaluate((state) => {
            window.tribesClient.handleMessage({
                type: 'infoRequest',
                label: 'status',
                content: 'status',
                gameState: state
            });
        }, violenceState);

        bannerState = await page.evaluate(() => ({
            title: document.getElementById('conflictBannerTitle').textContent,
            body: document.getElementById('conflictBannerBody').textContent,
            isViolence: document.getElementById('conflictBanner').classList.contains('violence')
        }));

        expect(bannerState.title).toBe('Violence Active');
        expect(bannerState.body).toContain('share fish');
        expect(bannerState.isViolence).toBe(true);
    }, 25000);

    test('romance modal submits invite and consent updates together', async () => {
        await loginAs('eggplant');

        await page.evaluate(() => {
            const client = window.tribesClient;
            client.selectedCommand = { name: 'romance', description: 'Romance modal test' };
            if (!client.currentPopulation) {
                throw new Error('Population not loaded for romance test');
            }
            const playerName = document.getElementById('playerName').value.trim();
            const player = client.currentPopulation[playerName];
            const targets = Object.values(client.currentPopulation)
                .filter((p) => p.name !== playerName && p.gender !== player.gender)
                .map((p) => p.name);
            if (targets.length === 0) {
                throw new Error('No romance targets available in fixture');
            }
            client.currentRomanceLists = {
                inviteList: [],
                consentList: [],
                declineList: [],
                consentDict: {},
            };
            client.showCommandModal();
        });

        await page.waitForSelector('#commandModal.active');
        await page.waitForSelector('.romance-row');

        const result = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.romance-row'));
            const firstRow = rows[0];
            const firstName = firstRow.dataset.name;

            const inviteCheckbox = firstRow.querySelector('.romance-invite');
            if (inviteCheckbox && !inviteCheckbox.checked) {
                inviteCheckbox.click();
            }

            const responseSelect = firstRow.querySelector('.romance-dropdown');
            responseSelect.value = 'consent';
            responseSelect.dispatchEvent(new Event('change', { bubbles: true }));

            const passCheckbox = document.getElementById('invite_append_pass');
            if (passCheckbox && !passCheckbox.checked) {
                passCheckbox.click();
            }

            const sentPayloads = [];
            const originalSend = window.tribesClient.send.bind(window.tribesClient);
            window.tribesClient.send = (payload) => sentPayloads.push(payload);

            document.getElementById('modalExecuteBtn').click();

            window.tribesClient.send = originalSend;

            const invitePayload = sentPayloads.find(
                (p) => p.type === 'command' && p.command === 'invite'
            );
            const romancePayload = sentPayloads.find((p) => p.type === 'romanceRequest');
            const modalIsOpen = document
                .getElementById('commandModal')
                .classList.contains('active');

            return {
                firstName,
                invitePayload,
                romancePayload,
                modalIsOpen,
                sentCount: sentPayloads.length,
            };
        });

        expect(result.sentCount).toBeGreaterThanOrEqual(2);
        expect(result.invitePayload).toBeDefined();
        expect(result.invitePayload.parameters.invitelist).toContain(result.firstName);
        expect(result.invitePayload.parameters.invitelist).toContain('!pass');
        expect(result.romancePayload).toBeDefined();
        expect(result.romancePayload.consentDict[result.firstName]).toBe('consent');
        expect(result.modalIsOpen).toBe(false);
    }, 25000);

    test('connect and execute craft command', async () => {
        await loginAs('test_user_777');
        await openCommand('craft');
        await new Promise(r => setTimeout(r, 500));
        await page.waitForSelector('#param_item');
        await page.select('#param_item', 'basket');
        
        await page.click('#modalExecuteBtn');
        await new Promise(r => setTimeout(r, 1500)); 
        
        const modalClasses = await page.evaluate(() => document.getElementById('commandModal').className);
        expect(modalClasses).not.toContain('active');
        
        const messages = await page.evaluate(() => document.getElementById('messagesContainer').innerHTML);
        expect(messages).toContain('Only tribe members can work');
    }, 15000);

    test('guard and ignore update the guarded child list', async () => {
        await loginAs('eggplant');

        await openCommand('guard');
        await page.waitForSelector('input[name="unified_guard_Pebble"][value="guard"]');
        await page.click('input[name="unified_guard_Pebble"][value="guard"]');
        await page.click('#modalExecuteBtn');

        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(
            await page.$eval('#messagesContainer', (container) => container.innerText)
        ).toContain('eggplant starts guarding Pebble');
        await page.evaluate(() => window.tribesClient.refreshGameData());
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(await getPlayerGuarding('eggplant')).toEqual(['Pebble']);

        await openCommand('ignore');
        await page.waitForSelector('input[name="unified_guard_Pebble"][value="ignore"]');
        expect(
            await page.$eval('input[name="unified_guard_Pebble"][value="guard"]', (input) => input.checked)
        ).toBe(true);
        await page.click('input[name="unified_guard_Pebble"][value="ignore"]');
        await page.click('#modalExecuteBtn');

        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(
            await page.$eval('#messagesContainer', (container) => container.innerText)
        ).toContain('eggplant is not guarding any children');
        await page.evaluate(() => window.tribesClient.refreshGameData());
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(await getPlayerGuarding('eggplant')).toEqual([]);
    }, 20000);
});
