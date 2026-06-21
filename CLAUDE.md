# Personal Website — Moritz Flüchter

A React single-page personal website with a live network simulator as its visual centerpiece. Still under active development ("UNDER CONSTRUCTION" is shown in the navbar intentionally).

## Tech stack

- **React 18** via Create React App (`react-scripts`)
- **MUI v6** (Material UI) for all UI components and layout
- **D3.js v7** + `d3-force-boundary` for rendering and animating the network graph
- **`ip` / `ip-address`** for subnet calculations inside the simulator
- **`random-mac`** and **`shuffle-array`** as small simulation utilities

## Running / building

```bash
npm start    # dev server at localhost:3000
npm build    # production build → build/
npm test     # jest via react-scripts
```

## Project structure

```
src/
  App.js                        # Root: wraps HomePage in MUI ThemeProvider
  data/
    MyTheme.js                  # MUI theme (dark primary: #141414, blue accent)
    Publications.js             # Hardcoded publication records (dict keyed by "0","1",…)
    Projects.js                 # Hardcoded project records (same structure)
  components/
    Navbar.js                   # Top AppBar; nav buttons exist but are non-functional
    About.js                    # Stub — just a placeholder Typography element
    Publications.js             # Renders publicationDict from data/
    PublicationItem.js          # Single publication card
    Projects.js                 # Renders projectsDict from data/
    HomePage/HomePage.js        # Main layout: Flex row of Publications | Network | Projects
    NetworkSim/                 # The live network simulator (see below)
  img/
    icons.js                    # Exports inline SVG strings: Switch, Server, Client
    switch.svg / server.svg / client.svg
```

## NetworkSim architecture

The simulator is the most complex part of the codebase. It models a simplified layer-2/3 network stack inside the browser.

### Entry point

`NetworkSim/Network.js` (`NetworkSim` React component):
1. `genNetwork()` — procedurally generates nodes and links (configurable counts in `config.js`)
2. `renderer.draw_network()` — uses D3 force-directed layout to render the graph as SVG
3. `init()` — called after D3 layout stabilises; starts all node simulations with random delays
4. `update()` — called on a 1 s timer; picks a random client→server pair and sends an IP packet

### Node types

All nodes extend `NetworkNode` (base class with `ports`, `id`, `renderer`, `show_debug`).

| Class | File | Role |
|---|---|---|
| `Switch` | Switch.js | L2 forwarder; runs STP + EthernetSwitching |
| `Client` | Client.js | End-host; runs ARP + IPv4 + Ethernet |
| `Server` | Server.js | End-host; same stack as Client |

### Protocol stack (per node)

```
IPv4  ←→  ARP
  ↕
Ethernet / EthernetSwitching
  ↕
Port  →  Link  →  Port (of neighbour)
```

- **Port** (`Port.js`): owns a MAC address and optional IP/CIDR (servers get `10.0.0.X/16`, clients `10.0.1.X/16`). Calls `renderer.anim_packet()` then `setTimeout` to deliver to the peer's `receive_packet`.
- **Link** (`Link.js`): bidirectional connection; holds references to both ports.
- **Ethernet** (`Ethernet.js`): L2 framing; dispatches by EtherType to registered handlers (e.g. `0x0800` → IPv4).
- **EthernetSwitching** (`EthernetSwitching.js`): MAC learning table; flood / forward logic for Switch nodes.
- **ARP** (`ARP.js`): resolves IP→MAC; notifies IPv4 via callback when resolved.
- **IPv4** (`IPv4.js`): builds `IPHeader`, queues packets waiting for ARP, then hands to Ethernet.
- **STP** (`STP.js`): Spanning Tree Protocol; elects a root bridge and blocks redundant ports. `Network.update()` waits for STP to converge before sending traffic.

### Renderer (`Renderer.js`)

Uses D3 to draw SVG nodes (inline SVG icons) and `<line>` links. `anim_packet()` appends a `<circle>` to the SVG and transitions it along the link, then removes it on arrival. Node clicks trigger `show_debug` (defined in `NetworkNode`).

### Configuration (`config.js`)

All tunable simulation constants live here: `NUM_SWITCHES` (20), `NUM_SERVERS` (10), `NUM_CLIENTS` (10), `UPDATE_PERIOD` (1000 ms), link speed range, and per-protocol packet colours.

## Known incomplete areas / TODOs

- Navbar buttons (`Publications`, `Projects`, `About Me`) render but do nothing — routing/scrolling not wired up.
- `About.js` is an empty stub.
- Publications and Projects are hardcoded dicts; the intent was to load them automatically.
- IPv4 receive handler just `console.log`s — no real L4 layer.
- IP address assignment is hardcoded in `Port.js`; DHCP was considered.
- STP `check_root` logic counts roots — `!(root_count > 1)` means it returns `true` when zero roots exist (edge case).
- `d3-graphviz` is a declared dependency but not used anywhere.
- The network topology is re-generated on every page refresh (no seed/persistence).
- Mobile layout is hidden (`display: { xs: 'none', md: 'flex' }`) — the site only shows content on medium+ screens.
