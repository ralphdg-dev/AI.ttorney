/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './e2e/test-reports',
        filename: process.env.TEST_FEATURE ? `${process.env.TEST_FEATURE}-test-report.html` : 'all-features-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: process.env.TEST_FEATURE ? `AI.ttorney ${process.env.TEST_FEATURE.charAt(0).toUpperCase() + process.env.TEST_FEATURE.slice(1)} Feature Test Report` : 'AI.ttorney E2E Test Report',
        logoImgPath: undefined,
        customInfos: [
          {
            title: 'Test Environment',
            value: 'Android Automation Testing'
          },
          {
            title: 'Test Suite',
            value: process.env.TEST_FEATURE ? `${process.env.TEST_FEATURE.charAt(0).toUpperCase() + process.env.TEST_FEATURE.slice(1)} Feature` : 'All Features'
          },
          {
            title: 'Test Date',
            value: new Date().toLocaleString()
          }
        ]
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './e2e/test-reports',
        outputName: process.env.TEST_FEATURE ? `${process.env.TEST_FEATURE}-junit.xml` : 'all-features-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  collectCoverage: false,
  coverageDirectory: '<rootDir>/e2e/coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  testResultsProcessor: 'jest-sonar-reporter'
};
