# Renovate APS Viewer

[![Worker](https://img.shields.io/badge/worker-orange?style=for-the-badge)](https://renovate-aps-viewer.phi-ag.workers.dev/)

Parse APS viewer versions from [aps.autodesk.com](https://aps.autodesk.com/en/docs/viewer/v7/change_history/changelog_v7/) and serve the result in the required JSON format for [Renovate Custom Datasources](https://docs.renovatebot.com/modules/datasource/custom/).

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    ":semanticCommits",
    "config:best-practices",
    "group:monorepos",
    "group:recommended"
  ],
  "customDatasources": {
    "aps-viewer": {
      "defaultRegistryUrlTemplate": "https://renovate-aps-viewer.phi-ag.workers.dev"
    }
  },
  "customManagers": [
    {
      "customType": "regex",
      "managerFilePatterns": ["vite.config.ts"],
      "matchStrings": ["const viewerVersion = \"(?<currentValue>.+?)\";"],
      "datasourceTemplate": "custom.aps-viewer",
      "depNameTemplate": "aps-viewer"
    }
  ]
}
```
