// Jest setup file for testing environment
import '@testing-library/jest-dom';

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock window.matchMedia for tests that use responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit
  ) {
    // Initialize properties based on options if provided
    if (options?.root) (this as any).root = options.root;
    if (options?.rootMargin) (this as any).rootMargin = options.rootMargin;
    if (options?.threshold) {
      (this as any).thresholds = Array.isArray(options.threshold) 
        ? options.threshold 
        : [options.threshold];
    }
  }

  observe(): void {
    return;
  }

  disconnect(): void {
    return;
  }

  unobserve(): void {
    return;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Setup for any additional global test utilities
beforeEach(() => {
  // Reset any mocks or test state before each test
  jest.clearAllMocks();
});
