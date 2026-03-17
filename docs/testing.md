# Testing Guide

## Overview
This document covers testing best practices and strategies for your project.

## Unit Tests
Write testss for individual functions and components:

```javascript
function add(a, b) {
	return a + b;
}

test('add should return sum', () => {
	expect(add(2, 3)).toBe(5);
});
```

## Integration Tests
Test how multiple components work together.

## Running Tests
```bash
npm test
```

## Best Practices
- Keep tests focused and isolated
- Use descriptive test names
- Aim for high code coverage
- Mock external dependencies

## Resources
- [Jest Documentation](https://jestjs.io)
- [Testing Library](https://testing-library.com)