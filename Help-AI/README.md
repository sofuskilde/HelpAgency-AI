# Help-AI Project

## Project Structure

```
Help-AI-Chat/              # Root directory
├── Help-AI/               # Next.js application directory
│   ├── src/              # Source code
│   ├── public/           # Public assets
│   ├── package.json      # Project dependencies
│   └── ...               # Other Next.js files
└── README.md             # This file
```

## Development Setup

1. Always ensure you're in the correct directory:
   ```bash
   cd Help-AI-Chat/Help-AI  # This is where the Next.js app lives
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Important Notes

- All development work should be done in the `Help-AI` directory
- The PDF.js worker file is automatically copied to `public/` during installation
- Always check your current directory with `pwd` before running commands
- Use relative imports from the `src/` directory

## Common Issues

If you encounter PDF.js worker initialization issues:
1. Ensure you're in the correct directory (`Help-AI`)
2. Run `npm install` to trigger the postinstall script
3. Verify that `public/pdf.worker.min.js` exists 