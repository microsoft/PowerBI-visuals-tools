/*
 *  Power BI Visual CLI - MCP Server - Best Practices Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

export function getBestPractices(): string {
    return `# Power BI Custom Visual Best Practices

## 🎯 API & Version Management

1. **Use Latest API Version**: Always use the latest stable powerbi-visuals-api (currently v5.x)
   - Run: \`npm install powerbi-visuals-api@latest\`
   - Update apiVersion in pbiviz.json

2. **TypeScript Strict Mode**: Enable strict mode in tsconfig.json for better type safety
   \`\`\`json
   { "compilerOptions": { "strict": true } }
   \`\`\`

## ⚡ Performance Optimization

3. **Minimize Update Loop Work**: The \`update()\` method is called frequently
   - Cache DOM selections
   - Use data binding efficiently (D3.js .join() pattern)
   - Avoid heavy computations in update()

4. **Use Lazy Loading**: Load resources only when needed
   - Defer non-critical rendering
   - Use requestAnimationFrame for smooth animations

5. **Optimize Data Processing**:
   - Process data once in update(), store results
   - Use Web Workers for heavy calculations
   - Implement pagination with fetchMoreData for large datasets

## 🔒 Security Guidelines

6. **No External Network Calls**: Avoid fetch/XMLHttpRequest to external URLs
   - Use only Power BI host services
   - Required for certification

7. **Sanitize User Input**: Always sanitize data before rendering
   - Escape HTML in tooltips and labels
   - Prevent XSS vulnerabilities

8. **No eval() or Function()**: Never use dynamic code execution

## ♿ Accessibility (Required for Certification)

9. **Keyboard Navigation**: Implement IVisualHost.hostCapabilities
   - Support Tab navigation
   - Provide keyboard shortcuts

10. **High Contrast Mode**: Support all high contrast themes
    - Use host.colorPalette for colors
    - Test with Windows High Contrast

11. **Screen Reader Support**: Add proper ARIA labels
    - role attributes on interactive elements
    - aria-label for data points

## 📦 Project Structure

12. **Modular Code**: Split code into logical modules
    - Separate data transformation, rendering, and formatting
    - Use ES6 modules

13. **Proper Error Handling**: Graceful degradation
    \`\`\`typescript
    try {
        // rendering logic
    } catch (e) {
        console.error('Visual error:', e);
    }
    \`\`\`

## 🎨 Formatting Pane (Modern)

14. **Use FormattingModel**: Implement getFormattingModel() for modern formatting
    - Provides better UX than legacy format pane
    - Required for new visuals

## 🧪 Testing

15. **Unit Tests**: Test data transformation logic
16. **Visual Tests**: Use Playwright or similar for E2E tests
17. **Test Edge Cases**: Empty data, single point, large datasets

## 📝 Documentation

18. **README.md**: Document visual capabilities and usage
19. **Changelog**: Track version changes
20. **Inline Comments**: Document complex logic

---
For more details, visit: https://learn.microsoft.com/en-us/power-bi/developer/visuals/
`;
}
