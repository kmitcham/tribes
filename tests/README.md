# Tribes Command System Unit Tests

This test suite comprehensively validates that commands send the correct arguments to the server in the Tribes game interface.

## Overview

The test suite consists of three main test files that cover different aspects of the command system:

### 1. `tribes-client.test.js` - Client-Side Testing
Tests the TribesClient class and its command sending functionality:
- WebSocket message structure validation
- Parameter collection from UI forms
- Command execution with different parameter types
- Auto-execution for parameterless commands
- Modal popup system functionality

### 2. `websocket-server.test.js` - Server-Side Testing  
Tests the server's command processing and parameter handling:
- Mock interaction creation for Discord command compatibility
- Parameter type conversion (strings, integers, booleans, arrays)
- Command execution workflow
- Error handling and validation

### 3. `e2e-command-flow.test.js` - End-to-End Testing
Tests the complete command flow from client to server:
- Full roundtrip communication
- Complex command workflows (reproduction, work sequences)
- Parameter preservation through the entire flow
- Error scenarios and edge cases

## Test Coverage

The tests validate these critical aspects:

### Message Structure
- ✅ Correct WebSocket message format
- ✅ Automatic addition of clientId, tribe, playerName, password
- ✅ Proper command type identification

### Parameter Types
- ✅ **Simple Parameters**: text, numbers, booleans
- ✅ **Choice Parameters**: dropdown selections
- ✅ **Player Targeting**: single player selection
- ✅ **Ordering Parameters**: array-based player lists (invite, consent, decline)
- ✅ **Mixed Parameters**: commands with multiple parameter types

### Command Categories Tested
- ✅ **Reproduction Commands**: romance, invite, consent, decline
- ✅ **Work Commands**: craft, hunt, guard, gather
- ✅ **General Commands**: auto-executing commands with no parameters

### Specific Command Examples
```javascript
// Romance (no parameters)
{ type: 'command', command: 'romance', parameters: {} }

// Craft (required + optional parameters)  
{ type: 'command', command: 'craft', parameters: { item: 'basket', force: '3' } }

// Invite (array parameters)
{ type: 'command', command: 'invite', parameters: { invitelist: ['Player1', 'Player2'] } }

// Guard (player targeting)
{ type: 'command', command: 'guard', parameters: { player: 'TargetPlayer' } }
```

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Client-side tests only
npm test tribes-client.test.js

# Server-side tests only  
npm test websocket-server.test.js

# End-to-end tests only
npm test e2e-command-flow.test.js
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode for Development
```bash
npm test -- --watch
```

### Verbose Output
```bash
npm test -- --verbose
```

## Test Structure

Each test file follows this pattern:

```javascript
describe('Component/Feature Name', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });
  
  describe('Specific Functionality', () => {
    test('should behave correctly', () => {
      // Arrange - setup test data
      // Act - execute the functionality  
      // Assert - verify expected results
    });
  });
});
```

## Key Test Scenarios

### 1. Parameter Collection
```javascript
test('should handle invite command with ordered player list', () => {
  const mockInputs = [
    { id: 'param_invitelist', type: 'hidden', value: 'Player1,Player2' }
  ];
  
  const parameters = tribesClient.collectParametersFromContainer(mockInputs);
  
  expect(parameters).toEqual({
    invitelist: ['Player1', 'Player2']  // Array conversion
  });
});
```

### 2. Command Execution
```javascript
test('should send craft command with required item parameter', () => {
  tribesClient.executeModalCommand({ item: 'basket' });
  
  const sentMessage = mockWs.getLastSentMessage();
  expect(sentMessage).toMatchObject({
    type: 'command',
    command: 'craft', 
    parameters: { item: 'basket' },
    clientId: 'test-client-id',
    tribe: 'bear'
  });
});
```

### 3. Server Processing
```javascript
test('should process array parameters correctly', () => {
  const interaction = createMockInteraction({
    parameters: { invitelist: ['P1', 'P2', 'P3'] }
  });
  
  // Arrays converted to comma-separated strings for Discord compatibility
  expect(interaction.options.getString('invitelist')).toBe('P1,P2,P3');
});
```

## Mock Objects

The tests use comprehensive mocks for:

- **WebSocket**: MockWebSocket class with message tracking
- **DOM Elements**: Full document mock with getElementById, createElement
- **Server Commands**: Mock command modules with jest.fn() execution tracking  
- **Game State**: Mock tribe state with population and settings

## Custom Matchers

The test suite includes custom Jest matchers:

```javascript
// Validate command message structure
expect(message).toHaveValidCommandStructure();

// Validate parameter format
expect(message).toHaveValidParameterFormat({
  item: 'basket',
  invitelist: ['Player1', 'Player2']
});
```

## Error Testing

The suite validates error handling for:
- Missing required parameters
- Unknown commands  
- Invalid parameter types
- WebSocket connection failures
- Server processing errors

## Integration Testing

End-to-end tests simulate real user workflows:

```javascript
test('should handle complete reproduction workflow', async () => {
  // 1. Check current status
  client.executeCommand('romance');
  
  // 2. Invite preferred mates
  client.executeCommand('invite', { 
    invitelist: ['PreferredMate', 'BackupChoice'] 
  });
  
  // 3. Consent to invitations
  client.executeCommand('consent', { 
    consentlist: ['AcceptablePartner'] 
  });
  
  // Verify all commands sent correct parameters
});
```

## Coverage Goals

The test suite aims for:
- **Functions**: 85%+ coverage
- **Lines**: 80%+ coverage  
- **Branches**: 75%+ coverage
- **Statements**: 80%+ coverage

## Running in CI/CD

For continuous integration:

```bash
# Run tests with machine-readable output
npm test -- --ci --coverage --testResultsProcessor=jest-junit
```

## Troubleshooting

### Common Issues:

1. **WebSocket Mock Not Working**
   - Ensure `tests/setup.js` is loaded
   - Check jest.config.js setupFilesAfterEnv

2. **DOM Elements Undefined**
   - Verify document.getElementById mock in setup
   - Check element IDs match between tests and implementation

3. **Async Test Failures**
   - Use async/await properly
   - Increase testTimeout in jest.config.js if needed

4. **Parameter Type Mismatches**
   - Verify array vs string handling
   - Check that hidden inputs are processed as arrays

## Adding New Tests

When adding new commands or features:

1. **Client Tests**: Add to `tribes-client.test.js`
   - Test parameter collection
   - Test command execution
   - Test UI interaction

2. **Server Tests**: Add to `websocket-server.test.js`  
   - Test mock interaction creation
   - Test parameter processing
   - Test command execution

3. **E2E Tests**: Add to `e2e-command-flow.test.js`
   - Test complete workflows
   - Test error scenarios
   - Test parameter preservation

Follow the existing patterns and ensure both success and error cases are covered.

## Configuration

The test configuration is in `jest.config.js` and includes:
- Node.js test environment
- Coverage thresholds
- Setup file loading  
- Test file patterns
- Transform settings

This comprehensive test suite ensures that all command arguments are correctly transmitted from client to server, maintaining the integrity of the game's command system.