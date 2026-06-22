# Personal website

This repository contains my personal website. It includes information about my research, publications, projects, and a browser-based network simulator.

## Network simulator

The site contains an interactive network simulator on `/sim`. A smaller preview is also shown on the home page.

The simulator generates a network with autonomous systems, routers, switches, clients, servers, and DNS nodes. It visualizes packet movement and lets users inspect protocol state by clicking nodes.

The lower-layer protocol work was built to better understand how these protocols behave in practice and how flexible network-device models can be implemented. This includes STP, ARP, Ethernet, and IPv4. Higher-layer behavior, such as DNS, TCP, and HTTP, is included to make the simulation more complete and easier to explore.

The simulator currently includes:

- STP root and blocked-port visualization
- ARP signalling
- Ethernet switching and forwarding tables
- IPv4 routing tables
- DNS resolution
- TCP and HTTP traffic
- Configurable topology generation on `/sim`

## Development

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm start
```

Build the production version:

```sh
npm run build
```

## Notes

This is a personal project and research website, not a general-purpose network simulator. The simulator is intentionally simplified in places so that protocol behavior remains visible and understandable in the browser.

## License

This project is licensed under the MIT License.
