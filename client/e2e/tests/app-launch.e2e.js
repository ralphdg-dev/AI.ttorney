const { device, element, by, expect, waitFor } = require('detox');

describe('App Launch Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should launch app successfully', async () => {
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
    
    await device.takeScreenshot('app-launch-success');
  });

  it('should display initial UI elements', async () => {
    await waitFor(element(by.id('main-content')))
      .toBeVisible()
      .withTimeout(15000);
    
    await expect(element(by.id('main-content'))).toBeVisible();
    await device.takeScreenshot('initial-ui-loaded');
  });

  it('should be responsive to user interaction', async () => {
    await waitFor(element(by.id('main-content')))
      .toBeVisible()
      .withTimeout(10000);
    
    await element(by.id('main-content')).tap();
    
    // App should remain stable after interaction
    await expect(element(by.id('main-content'))).toBeVisible();
    await device.takeScreenshot('app-interaction-test');
  });
});
