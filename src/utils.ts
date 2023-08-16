import randUserAgentLib from 'rand-user-agent'

function randUserAgent({ browser = 'chrome', os = 'mac os', device = 'desktop' }) {
    device = device.toLowerCase()
    browser = browser.toLowerCase()
    os = os.toLowerCase()
    let UA = randUserAgentLib(device, browser, os)

    if (browser === 'chrome') {
        while (UA.includes('Chrome-Lighthouse')
          || UA.includes('Gener8')
          || UA.includes('HeadlessChrome')
          || UA.includes('SMTBot')) {
            UA = randUserAgentLib(device, browser, os);
        }
    }
    if (browser === 'safari') {
        while (UA.includes('Applebot')) {
            UA = randUserAgentLib(device, browser, os);
        }
    }
    return UA;
}

export {
  randUserAgent
}