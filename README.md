# 🧩 PrimeVue MCP Server

Model Context Protocol (MCP) server providing structured access to **PrimeVue components** and **design tokens** — including props, examples, and metadata for AI and developer tools.

[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-blue?logo=cursor)](cursor://add-mcp?url=https://primevue-mcp-1.onrender.com)
[![Live API](https://img.shields.io/badge/Open-Live%20API-green)](https://primevue-mcp-1.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](./LICENSE)

---

## 🚀 Features

- 🔍 **Query**: Search, filter, and explore PrimeVue components  
- 🧱 **Resources**: Access structured component metadata and design tokens  
- ⚡️ **Tools**: Retrieve props, examples, and documentation  
- 🌐 **Public API**: Available online and via local STDIO

---

## 🧩 Available Tools

| Tool | Description |
|------|--------------|
| `search_components` | Search components by name, title, or description |
| `get_component` | Get detailed information about a specific component |
| `search_tokens` | Search design tokens |
| `list_components` | List all available components with stats |

---

## ⚙️ Usage

### 🧠 Add to Cursor (Recommended)
Click below to connect this MCP directly to Cursor:

👉 [**Add PrimeVue MCP to Cursor**](cursor://add-mcp?url=https://primevue-mcp-1.enol.dev)

<details>
<summary>🔧 Alternative: Copy MCP Configuration</summary>

```json
{
  "servers": [
    {
      "type": "http",
      "url": "https://primevue-mcp-1.enol.dev"
    }
  ]
}
```

Add this to your `.well-known/mcp.json` file in Cursor.
</details>

Or configure it manually in your `.well-known/mcp.json`:
```json
{
  "servers": [
    {
      "type": "http",
      "url": "https://primevue-mcp-1.onrender.com"
    }
  ]
}
