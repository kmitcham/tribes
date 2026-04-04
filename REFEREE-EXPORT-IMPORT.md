# Referee Export/Import Game Data Feature

## Overview

This feature allows referees (and referees only) to export and import complete game data files for individual tribes. This is useful for:

- Creating backups of game states
- Transferring game data between servers
- Restoring games from specific points in time
- Debugging or testing with specific game states

## Security

- Only players listed in `libs/referees.json` can access these functions
- All export/import actions are logged with player name and timestamp
- Authentication is required for all operations
- Automatic backups are created before any import operation

## Server-Side Implementation

### New WebSocket Message Types

#### Export Game: `exportGame`

- **Message Type**: `exportGame`
- **Required Parameters**:
  - `playerName`: Name of the requesting player (must be in referees list)
  - `tribe` or `tribeName`: Name of the tribe to export
  - Valid session token or password authentication

#### Import Game: `importGame`

- **Message Type**: `importGame`
- **Required Parameters**:
  - `playerName`: Name of the requesting player (must be in referees list)
  - `tribe` or `tribeName`: Name of the tribe to import into
  - `importData`: JSON object containing the game data to import
  - Valid session token or password authentication

### Response Message Types

#### Export Response: `exportGameResponse`

- **Success Response**:
  ```json
  {
    "type": "exportGameResponse",
    "success": true,
    "tribeName": "bear-tribe",
    "exportData": {
      /* complete game data with metadata */
    },
    "filename": "bear-tribe-export-2026-03-01T15-30-45.json"
  }
  ```

#### Import Response: `importGameResponse`

- **Success Response**:
  ```json
  {
    "type": "importGameResponse",
    "success": true,
    "tribeName": "bear-tribe",
    "message": "Game data imported successfully. Backup saved as: bear-tribe-pre-import-backup-2026-03-01T15-30-45.json",
    "backupFilename": "bear-tribe-pre-import-backup-2026-03-01T15-30-45.json"
  }
  ```

## Export Data Format

### With Metadata (New Format)

```json
{
  "metadata": {
    "tribeName": "bear-tribe",
    "exportedBy": "referee-username",
    "exportedAt": "2026-03-01T15:30:45.123Z",
    "exportVersion": "1.0",
    "serverVersion": "dev"
  },
  "gameData": {
    "name": "bear-tribe",
    "population": {
      /* population data */
    },
    "children": {
      /* children data */
    },
    "round": "work",
    "seasonCounter": 42
    /* ... all other game state properties ... */
  }
}
```

### Legacy Format (Also Supported)

Direct game state object without metadata wrapper. The import function can handle both formats.

## Client-Side Implementation

### UI Elements

When a referee logs in, a "Referee Tools" section appears with:

- **Export Game Data** button (green) - Downloads current tribe data as JSON file
- **Import Game Data** button (yellow) - Opens file picker to import JSON data

### User Flow

#### Export Process

1. Referee selects tribe from dropdown
2. Clicks "Export Game Data" button
3. System validates referee status and authentication
4. Complete game data is packaged with metadata
5. Browser automatically downloads the JSON file
6. Success message confirms export completion

#### Import Process

1. Referee selects target tribe from dropdown
2. Clicks "Import Game Data" button
3. File picker opens (accepts only .json files)
4. System reads and validates JSON file
5. Confirmation dialog warns about data replacement
6. If confirmed:
   - Automatic backup of current data is created
   - New data is imported and saved
   - All connected players see updated game state
   - Success message shows backup filename

## Error Handling

### Common Error Conditions

- **Authentication Failed**: Invalid session or password
- **Access Denied**: Player is not a referee
- **Missing Tribe**: No tribe name provided
- **Invalid File**: JSON parsing errors or missing required fields
- **Missing Population**: Import data lacks required population object
- **File System Errors**: Backup creation or data saving failures

### Backup Safety

- Every import automatically creates a timestamped backup in `archive/{tribeName}/`
- Backup includes metadata showing who performed the backup and why
- Original data is never lost without a recoverable backup

## File Locations

### Server Files Created/Modified

- `websocket-server.js` - Added `handleExportGame()` and `handleImportGame()` functions
- `commands/admin/exportgame.js` - Discord command placeholder
- `commands/admin/importgame.js` - Discord command placeholder
- `tribes-interface.html` - Added UI elements and client-side handlers

### Backup Storage

- `archive/{tribeName}/{tribeName}-pre-import-backup-{timestamp}.json`

## Logging

All export/import operations are logged with:

- Player name performing the action
- Tribe name affected
- Timestamp of the operation
- Success/failure status
- Backup file names (for imports)

## Testing the Feature

### Prerequisites

1. Start the websocket server: `node websocket-server.js`
2. Add your username to `libs/referees.json`
3. Access the web interface at `http://localhost:8000`

### Test Export

1. Log in as a referee
2. Select a tribe that has game data
3. Click "Export Game Data"
4. Verify JSON file downloads with correct data

### Test Import

1. Export data from one tribe (or prepare test JSON)
2. Select a different tribe or create test tribe
3. Click "Import Game Data" and select the JSON file
4. Confirm the warning dialog
5. Verify data imports correctly and backup is created

## Security Considerations

- Only referees can access this functionality
- All operations require valid authentication
- Comprehensive logging for audit trail
- Input validation prevents malicious data injection
- Automatic backups prevent data loss
- No direct file system access from client side
