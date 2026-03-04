# Enhanced Game Snapshot Management System

## Overview

The tribes game now has an improved snapshot management system that prevents accumulation of unlimited game files and provides clear game lifecycle management.

## New Features

### 1. Limited Snapshots (Max 3 per Tribe)

- Each tribe now maintains at most **3 snapshots** of their gamestate
- Older snapshots are automatically deleted when new ones are created
- Snapshots are kept in `tribe-data/{tribeName}/` with timestamp format: `{tribeName}-{ISO-timestamp}.json`

### 2. Final Game State Archiving

When a game ends:
- A final gamestate is saved with format: `{tribe-name}-final-YYYY-MM-DD.json`
- Example: `bear-final-2026-03-02.json`
- This preserves the completed game for historical reference

### 3. Game File Cleanup

After a game ends:
- The main game file (`{tribeName}.json`) is **deleted**
- This ensures the tribe is ready to start a fresh game
- No leftover state interferes with new games

## How It Works

### Normal Game Operation
1. Regular snapshots are created during gameplay (via `gameState.archiveRequired = true`)
2. System automatically maintains only the 3 most recent snapshots
3. Oldest snapshots are deleted when new ones are added

### Game Ending Process
1. Game ends (via endgame command or condition)
2. `gameState.ended = true` is set
3. Final gamestate is saved to `{tribe-name}-final-YYYY-MM-DD.json`
4. Main game file `{tribeName}.json` is removed
5. Tribe is ready for a new game

## Technical Implementation

### New Functions in [libs/save.js](libs/save.js)

#### `saveFinalGameState(gameState)`
- Creates final archive with date-based filename
- Marks gamestate as `finalSave: true`
- Includes `finalSaveDate` timestamp

#### `clearMainGameFile(tribeName)`
- Removes the main game file for the tribe
- Logs confirmation of cleanup

#### `manageSnapshots(tribeName)`
- Scans tribe directory for snapshot files
- Keeps only 3 most recent based on file modification time
- Excludes main game file and final save files from deletion

#### Updated `archiveTribe(gameState)`
- Detects if game has ended (`gameState.ended === true`)
- Routes to final save process for ended games
- Continues normal snapshot management for active games

## File Structure

```
tribe-data/
├── {tribeName}/
│   ├── {tribeName}.json              # Active game (deleted when game ends)
│   ├── {tribeName}-{timestamp}.json  # Up to 3 snapshots
│   ├── {tribeName}-{timestamp}.json
│   ├── {tribeName}-{timestamp}.json
│   └── {tribeName}-final-YYYY-MM-DD.json  # Final completed game
```

## Benefits

1. **Space Efficiency**: No unlimited accumulation of snapshot files
2. **Clear Lifecycle**: Obvious distinction between active and completed games
3. **Fresh Starts**: Clean slate for new games
4. **Historical Record**: Final games preserved for reference
5. **Automatic Management**: No manual cleanup required

## Backwards Compatibility

- Existing snapshot files are preserved
- Existing game files continue to work
- New management only applies to new snapshot operations
- No data loss for current games

## Testing

The system has been thoroughly tested with:
- ✓ Snapshot limit enforcement (keeps 3 most recent)
- ✓ Final game state creation (proper filename format)
- ✓ Main game file cleanup (complete removal)  
- ✓ Complete end-game archive process
- ✓ Existing functionality preservation (all tests pass)