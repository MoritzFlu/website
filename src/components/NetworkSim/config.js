import * as d3 from "d3";

export const UPDATE_PERIOD    = 100;   // ms between convergence-check polls

export const TIME_SCALE       = 1000;
export const MAX_LINK_SPEED   = TIME_SCALE;
export const MIN_LINK_SPEED   = 0.5 * TIME_SCALE;
export const MAX_STARTUP_DELAY = 200;  // ms of random init jitter per node

export const BPDU_COLOR  = "#7c3aed";
export const PACKET_SIZE = 4.5;
export const PACKET_EASE = d3.easeLinear;

export const NUM_ASNS              = 3;
export const MIN_ROUTERS_PER_ASN   = 2;
export const MAX_ROUTERS_PER_ASN   = 3;   // L3 routers per ASN, each owns one L2 subnet
export const MIN_SWITCHES_PER_SUBNET = 2;
export const MAX_SWITCHES_PER_SUBNET = 6;
export const MIN_SERVERS_PER_SUBNET  = 1;
export const MAX_SERVERS_PER_SUBNET  = 3;
export const MIN_CLIENTS_PER_SUBNET  = 1;
export const MAX_CLIENTS_PER_SUBNET  = 4;

export const NETWORK_SVG_REF = "network-svg";
export const LINK_COLOR      = "#c7c2ba";

export const ARP_COLOR      = "#2563eb";
export const STP_COLOR      = "#dc2626";
export const ETHERNET_COLOR = "#ca8a04";
export const IPV4_COLOR     = "#16a34a";
export const ICMP_COLOR     = "#0891b2";
export const BGP_COLOR      = "#b45309";
export const BGP_HOLD_TIME  = 90;
export const BGP_KEEPALIVE_INTERVAL = 500;   // ms — fast during handshake
export const BGP_KEEPALIVE_SLOW     = 3000;  // ms — after session established

export const STP_HELLO_FAST = 300;    // ms during convergence
export const STP_HELLO_SLOW = 3000;  // ms after convergence

export const TCP_WINDOW_SIZE = 5;
export const DNS_COLOR       = "#0d9488";
export const DNS_ROOT_COLOR  = "#0f766e";   // queries to/from root DNS
export const DNS_ASN_COLOR   = "#2dd4bf";   // queries to/from ASN-level DNS
export const DNS_LOCAL_COLOR = "#99f6e4";   // queries to/from subnet/local DNS
export const TCP_COLOR  = "#0284c7";
export const HTTP_COLOR = "#d97706";
export const RIP_COLOR  = "#65a30d";
export const RIP_INTERVAL_FAST = 300;    // ms during convergence
export const RIP_INTERVAL_SLOW = 3000;  // ms after convergence

export const DNS_REQUEST_INTERVAL = 1000;  // ms between token refills (1 request/s sustained rate)
export const DNS_BURST_SIZE       = 6;     // token bucket capacity; bucket starts full after startup

// Mutable simulation time scale. Port.send_packet multiplies every link delay by this.
// Start at 0.01 (fast-forward through startup), reset to 1.0 once warm traffic is flowing.
export const sim = { time_factor: 0.01 };

export const HOSTNAMES = [
    "cake", "hercules", "phoenix", "dragon", "nova",
    "echo", "flash", "storm", "apex", "cosmos",
    "pixel", "spark", "amber", "cedar", "vortex",
];
