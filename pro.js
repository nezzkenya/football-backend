import { readFile } from 'fs/promises';
import axios from 'axios';

// Read proxies from file
const readProxiesFromFile = async (filePath) => {
  try {
    const data = await readFile(filePath, 'utf8');
    const proxies = data.split('\n').filter(line => line.trim() !== '');
    return proxies;
  } catch (err) {
    throw new Error(`Error reading file: ${err.message}`);
  }
};

// Test a single proxy
const testProxy = async (proxy) => {
  try {
    const proxyUrl = new URL(proxy);
    const response = await axios.get('http://httpbin.org/ip', {
      proxy: {
        host: proxyUrl.hostname,
        port: parseInt(proxyUrl.port, 10),
        protocol: proxyUrl.protocol.replace(':', '')
      },
      timeout: 5000, // 5 seconds timeout
    });
    console.log(`Proxy ${proxy} is working. Response IP: ${response.data.origin}`);
  } catch (error) {
    console.log(`Proxy ${proxy} failed: ${error.message}`);
  }
};

// Test all proxies from the file
const testProxiesFromFile = async (filePath) => {
  try {
    const proxies = await readProxiesFromFile(filePath);
    for (const proxy of proxies) {
      await testProxy(proxy);
    }
  } catch (error) {
    console.error(`Error reading proxies from file: ${error.message}`);
  }
};

// Specify the path to your proxies.txt file
const filePath = 'proxies.txt';

// Run the proxy tests
testProxiesFromFile(filePath);
