# PrimeVue MCP Server

Model Context Protocol server for PrimeVue components and design tokens.

## Features

- **Resources**: Access to all PrimeVue components and design tokens
- **Tools**: Search, query, and explore PrimeVue components
- **Real-time**: Live access to component props, examples, and documentation

## Available Tools

- `search_components` - Search components by name, title, or description
- `get_component` - Get detailed information about a specific component
- `search_tokens` - Search design tokens
- `list_components` - List all available components with stats

## Usage

### Start MCP Server
```bash
npm run mcp
```

### Extract Data
```bash
npm run extract:all
```

## MCP Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "primevue": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/primevue-mcp"
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Extract PrimeVue data
npm run extract:all

# Start MCP server
npm run mcp
```
