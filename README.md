# 🏛️ Tribes Game - WebSocket Edition

A modernized version of the Tribes Discord bot, converted to a web-based interface using WebSockets. This project transforms the original Discord-based game into a standalone web application that can be run locally or deployed via Docker.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Build the container:**

   ```bash
   ./build-docker.sh
   ```

2. **Run the server:**

   ```bash
   ./run-docker.sh
   ```

3. **Access the game:**
   - Local: http://localhost:8000
   - Network: http://[YOUR-IP]:8000 (run `./setup-network.sh` to get your network URL)
   - Health Check: http://localhost:8000/health

### Option 2: Development Mode

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the development server:**

   ```bash
   ./run-dev.sh
   ```

3. **Access the game:**
   - Game Interface: http://localhost:8000
   - Health Check: http://localhost:8000/health

## 🎮 How to Play

1. **Open the web interface** at http://localhost:8000
2. **Select your tribe** from the dropdown (Bear, Flounder, Bug, etc.)
3. **Enter your player name** and optional password
4. **Register/Login** by clicking the "Register/Login" button
5. **Browse available commands** in the left sidebar, organized by category
6. **Select a command** to see its parameters and description
7. **Fill in parameters** and click "Execute Command"
8. **View game data** in the tabs (Population, Children, Game Status)

## � Network Access (Multiplayer)

To allow others on your local network to join the game:

1. **Get your network setup info:**

   ```bash
   ./setup-network.sh
   ```

2. **Share the network URL** with friends on the same WiFi/network:

   - They visit: `http://YOUR-IP:8000` (script will show the exact URL)
   - Each player registers with their own name
   - Everyone can join the same tribes and play together

3. **Requirements:**

   - All players must be on the same local network (WiFi/Ethernet)
   - Firewall must allow connections on port 8000
   - Server computer must keep running the tribes server

4. **Troubleshooting:**
   - Test with: `curl http://YOUR-IP:8000/health`
   - Check firewall settings on host computer
   - Ensure all devices are connected to the same network

## �🎯 Available Commands

The game includes all original Discord commands, organized into categories:

### 🏛️ Admin Commands

- `join` - Join a tribe
- `secrets` - View secret information
- `specialize` - Choose a profession
- `vote` - Vote on tribal matters

### 👑 Chief Commands

- `banish` - Remove a player from the tribe
- `decree` - Create tribal laws
- `endgame` - End the current game
- `induct` - Add new members
- `migrate` - Move the tribe
- `startfood`, `startrepro`, `startwork` - Begin game phases

### ⚔️ Conflict Commands

- `attack` - Attack other players or tribes
- `defend` - Defend against attacks
- `demand` - Make demands
- `faction` - Create or join factions
- `run` - Flee from conflict

### 🎲 General Commands

- `give` - Give items to other players
- `inventory` - View your possessions
- `status` - View game state
- `history` - View game history
- `help` - Get command help

### 👶 Reproduction Commands

- `romance`, `invite`, `consent`, `decline` - Relationship management
- `babysit`, `children` - Child care

### 🔄 Rounds Commands

- `feed` - Feed yourself or others
- `ready` - Mark yourself ready for next phase

### 🛠️ Work Commands

- `gather`, `hunt`, `craft` - Resource collection
- `guard`, `train` - Skill development
- `idle` - Rest turn

## 🔧 Architecture

### WebSocket Server (`websocket-server.js`)

- **Unified Command System:** Dynamically loads all Discord commands and makes them available via WebSocket
- **Mock Interaction Layer:** Converts WebSocket messages to Discord interaction format for compatibility
- **Real-time Communication:** Instant updates for game state changes
- **User Authentication:** Basic user registration and login system

### Web Interface (`tribes-interface.html`)

- **Modern UI:** Clean, responsive interface with tabbed layout
- **Command Browser:** Categorized command list with descriptions
- **Dynamic Forms:** Auto-generated parameter forms based on command definitions
- **Real-time Updates:** Live game data updates via WebSocket
- **Error Handling:** Comprehensive error messaging and connection status

### Docker Support

- **Production-Ready Container:** Optimized Alpine Linux image
- **Health Checks:** Built-in container health monitoring
- **Volume Persistence:** Game data persists between container restarts
- **Security:** Non-root user execution

## 📁 Project Structure

```
TribesAgent/
├── commands/           # All game commands (organized by category)
│   ├── admin/         # Administrative commands
│   ├── chief/         # Chief-only commands
│   ├── conflict/      # Combat and conflict
│   ├── general/       # General gameplay
│   ├── reproduction/  # Romance and children
│   ├── rounds/        # Turn-based mechanics
│   └── work/          # Resource gathering
├── libs/              # Core game logic libraries
├── tests/             # Unit tests
├── websocket-server.js     # Main WebSocket server
├── tribes-interface.html   # Web interface
├── Dockerfile         # Container definition
├── build-docker.sh    # Docker build script
├── run-docker.sh      # Docker run script
└── run-dev.sh         # Development server script
```

## 🛠️ Development

### Adding New Commands

1. Create command file in appropriate `commands/` subdirectory
2. Follow Discord.js command structure with `data` and `execute` exports
3. Server will automatically load and expose the command via WebSocket

### Modifying the Interface

- Edit `tribes-interface.html` for UI changes
- Commands and parameters are dynamically generated
- WebSocket protocol is documented in server code comments

### Running Tests

```bash
npm test
```

## 🐳 Docker Management

### View Logs

```bash
docker logs -f tribes-server
```

### Stop Server

```bash
docker stop tribes-server
```

### Restart Server

```bash
docker restart tribes-server
```

### Remove Container

```bash
docker stop tribes-server
docker rm tribes-server
```

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 8000)
- `NODE_ENV` - Environment mode (development/production)

### Data Persistence

Game data is stored in JSON files:

- `users.json` - Player accounts
- `[tribe-name]-tribe/` - Tribe-specific game data

## 🌐 Network Requirements

- **Port 8000** - Main server (WebSocket + HTTP)
- **Outbound Internet** - For npm package installation during build

## 🔄 Migration from Discord

This version maintains full compatibility with the original Discord bot logic:

- All commands retain their original parameters and behavior
- Game state files are compatible between versions
- Users can migrate existing games by copying tribe data files

## 🐛 Troubleshooting

### Connection Issues

- Check if port 8000 is available
- Verify firewall settings
- Try accessing http://localhost:8000/health

### Docker Issues

- Ensure Docker is running
- Check available disk space
- Try rebuilding with `./build-docker.sh`

### Game Data Issues

- Check file permissions in tribe directories
- Verify JSON file integrity
- Check server logs for detailed errors

## 📜 License

ISC - See original project license

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

---

**Enjoy playing Tribes in your browser! 🎮**
