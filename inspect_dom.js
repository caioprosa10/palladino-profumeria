const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewport({ width: 1440, height: 900 });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  const results = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const header = document.querySelector('.main-header');
    
    return {
      html: {
        marginTop: getComputedStyle(html).marginTop,
        paddingTop: getComputedStyle(html).paddingTop,
        rect: html.getBoundingClientRect().toJSON()
      },
      body: {
        marginTop: getComputedStyle(body).marginTop,
        paddingTop: getComputedStyle(body).paddingTop,
        rect: body.getBoundingClientRect().toJSON()
      },
      header: {
        marginTop: header ? getComputedStyle(header).marginTop : null,
        top: header ? getComputedStyle(header).top : null,
        position: header ? getComputedStyle(header).position : null,
        rect: header ? header.getBoundingClientRect().toJSON() : null
      }
    };
  });
  
  console.log(JSON.stringify(results, null, 2));
  
  await browser.close();
})();
