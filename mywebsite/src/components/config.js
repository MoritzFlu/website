import * as d3 from "d3";

export const UPDATE_PERIOD = 5000;

export const TIME_SCALE = 1000;
export const MAX_LINK_SPEED = TIME_SCALE;
export const MIN_LINK_SPEED = 0.5*TIME_SCALE;
export const MAX_STARTUP_DELAY = TIME_SCALE;

export const BPDU_COLOR = "#f403fc";
export const PACKET_SIZE = 2;
export const PACKET_EASE = d3.easeLinear;

export const NUM_SWITCHES = 20;
export const NUM_SERVERS = 10;
export const NUM_CLIENTS = 10;

export const NETWORK_SVG_REF = "network-svg";

export const LINK_COLOR = "#aaa";

export const ARP_COLOR = "#0000FF";
export const STP_COLOR = "#FF00FF";
export const ETHERNET_COLOR = "#00FF00";
export const IPV4_COLOR = "#FFFF00";