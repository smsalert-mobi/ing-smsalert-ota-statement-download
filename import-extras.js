const puppeteer = require('puppeteer');
const readline  = require('readline');
const axios = require('axios');
const path = require('path');

const ING_USERNAME = '';
const ING_PASSWORD = '';

const SMSALERT_API_USERNAME = ''
const SMSALERT_API_KEY = ''
const SMSALERT_FETCH_ENDPOINT = 'https://smsalert.mobi/api/v2/message/list?page=1&perPage=5';

async function consoleOTA(argument) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let fulfill;
    const answerPromise = new Promise(x => fulfill = x);
    rl.question('Enter SMS: ', (answer) => {
      fulfill(answer);
      rl.close();
    });
    return await answerPromise;
}

function retryOTA(fn, maxAttempts = 28, baseDelayMs = 1000) {
  let attempt = 1

  const execute = async () => {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error
      }

      const delayMs = baseDelayMs; 
      console.log(`Retry attempt ${attempt} after ${delayMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))

      attempt++
      return execute()
    }
  }

  return execute()
}

async function fetchMessages()
{
    let result = '';
    await axios.get(SMSALERT_FETCH_ENDPOINT, 
      {
        auth: {
          username: SMSALERT_API_USERNAME,
          password: SMSALERT_API_KEY
        }
      }
    ).then(function (response) {
      const receivedMessages = response.data.data;

      const regex = /.*ING.*?(\d+)$/;
      receivedMessages.every((element) => {
        const found = element.message.match(regex);
        if (found) {
          result = found[1];
          return;
        }
      });

    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })

    if (result === '') {
      throw Error('No OTA found');
    }

    return result;
}

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({headless: true, args: ['--disable-features=site-per-process']});
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

  // Navigate the page to a URL
  await page.goto('https://business.ing.ro/ing2/login#!/alias');

  await page.waitForSelector('.login-input', { visible: true, timeout: 15000 });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: path.resolve('./downloads'), 
  });

  // Type username
  await page.type('#MOD_LOG_ALS_alias', ING_USERNAME);

  // Type password
  await page.type('#MOD_LOG_ALS_password', ING_PASSWORD);

  await page.$eval("#submit_login", el => el.click());


  try {
    await page.waitForSelector('#MOD_LOG_ALS_sms', { visible: true, timeout: 5000 });

    // wait 5 seconds to receive the SMS first
    await new Promise(r => setTimeout(r, 5000));
    let ota = '';
    try {
      ota = await retryOTA(fetchMessages);
      console.log(`OTA: ${ota}`)
    } catch (error) {
      console.log(`Failed to get OTA: ${error.message}`);

      return;
    }

    await page.type('#MOD_LOG_ALS_sms', ota, {delay: 100});

    await page.click('button[type=submit]'); 
    await page.waitForNavigation(); 

  } catch (error) {
    console.log('SMS OTA not required');
  }

  const frame = page.frames().find(frame => frame.name() === 'main');

  if (!frame) {
     console.log('missing frame');
  }

  await frame.waitForSelector('#MOD_DSH_HDR_navmenu-left_historyList', { visible: true, timeout: 15000 });
  await frame.$eval('#MOD_DSH_HDR_navmenu-left_historyList', el => el.click());

  await frame.waitForSelector('#MOD_HIS_LST_link_exportPDF');
  await frame.$eval('#MOD_HIS_LST_link_exportPDF', el => el.click());

  // Extras table
  await frame.waitForSelector('.list-table .csf-grid-row');

  await new Promise(r => setTimeout(r, 1000));

  const tableRows  = await frame.$$(
    '.list-table .csf-grid-row', 
  );

  const rowCells   = await tableRows[0].$$('.csf-grid-table-cell');

  // Download last PDF
  await rowCells[rowCells.length - 1].$eval('button', el => el.click());

  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();