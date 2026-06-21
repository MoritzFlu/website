import * as d3 from "d3";
import * as Config from './config';
import * as SimMode from './SimMode';
import forceBoundary from 'd3-force-boundary';

function _is_relevant(color, mode) {
    switch (mode) {
        case 'stp':     return color === Config.BPDU_COLOR;
        case 'arp':     return color === Config.ARP_COLOR;
        case 'routing': return color === Config.BGP_COLOR || color === Config.RIP_COLOR;
        case 'dns':     return color === Config.DNS_ROOT_COLOR
                            || color === Config.DNS_ASN_COLOR
                            || color === Config.DNS_LOCAL_COLOR
                            || color === Config.DNS_COLOR;
        case 'tcp':     return color === Config.TCP_COLOR || color === Config.HTTP_COLOR;
        default:        return true;
    }
}

// Fill colors for each ASN background hull (index = ASN number).
const ASN_COLORS = [
    "rgba(13, 148, 136, 0.10)",
    "rgba(180, 83, 9, 0.09)",
    "rgba(87, 83, 78, 0.08)",
    "rgba(37, 99, 235, 0.08)",
    "rgba(101, 163, 13, 0.08)",
];
const ASN_STROKE = [
    "rgba(13, 148, 136, 0.42)",
    "rgba(180, 83, 9, 0.36)",
    "rgba(87, 83, 78, 0.32)",
    "rgba(37, 99, 235, 0.30)",
    "rgba(101, 163, 13, 0.30)",
];

const NODE_THEME = {
    "switch":     { fill: "#f5f5f4", stroke: "#78716c", accent: "#0d9488" },
    "server":     { fill: "#f8fafc", stroke: "#64748b", accent: "#0d9488" },
    "client":     { fill: "#ffffff", stroke: "#78716c", accent: "#2563eb" },
    "router":     { fill: "#f5f5f4", stroke: "#57534e", accent: "#0d9488" },
    "bgp-router": { fill: "#fff7ed", stroke: "#b45309", accent: "#d97706" },
    "dns-root":   { fill: "#f0fdfa", stroke: "#0f766e", accent: "#0d9488" },
    "dns-asn":    { fill: "#f0fdfa", stroke: "#0d9488", accent: "#14b8a6" },
    "dns-local":  { fill: "#f0fdfa", stroke: "#2dd4bf", accent: "#0d9488" },
};

const LEAF_TYPES = new Set(["client", "server", "dns-local"]);
const VISUAL_SCALE = 1.28;
const ICON_SIZE = 30 * VISUAL_SCALE;
const NODE_MIN_DISTANCE = 38 * VISUAL_SCALE;
const LEAF_BASE_RADIUS = 48 * VISUAL_SCALE;
const LEAF_MAX_RADIUS = 132 * VISUAL_SCALE;
const LINK_DISTANCE = 78 * VISUAL_SCALE;
const LEAF_LINK_DISTANCE = 42 * VISUAL_SCALE;
const INTERNAL_LINK_DISTANCE = 108 * VISUAL_SCALE;
const PEERING_LINK_DISTANCE = 160 * VISUAL_SCALE;
const COLLISION_RADIUS = 35 * VISUAL_SCALE;

function is_leaf_node(node) {
    return node && LEAF_TYPES.has(node.type);
}

function endpoint_node(endpoint, node_by_id) {
    return typeof endpoint === "string" ? node_by_id.get(endpoint) : endpoint;
}

function leaf_link_distance(link, node_by_id) {
    const source = endpoint_node(link.source, node_by_id);
    const target = endpoint_node(link.target, node_by_id);
    return is_leaf_node(source) || is_leaf_node(target);
}

function themed_icon(name) {
    const t = NODE_THEME[name] || NODE_THEME.router;
    const common = `xmlns='http://www.w3.org/2000/svg' width='${ICON_SIZE}px' height='${ICON_SIZE}px' viewBox='0 0 30 30'`;

    switch (name) {
        case "switch":
            return `<svg ${common}><rect x='3' y='5' width='24' height='20' rx='4' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.3'/><path d='M8 11h8M8 15h14M8 19h10' stroke='${t.stroke}' stroke-width='1.4' stroke-linecap='round'/><circle cx='22' cy='11' r='1.8' fill='${t.accent}'/></svg>`;
        case "server":
            return `<svg ${common}><rect x='6' y='4' width='18' height='22' rx='2.5' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.3'/><path d='M6 10h18M6 16h18M6 22h18' stroke='${t.stroke}' stroke-width='1'/><circle cx='20' cy='7' r='1.3' fill='${t.accent}'/><circle cx='20' cy='13' r='1.3' fill='${t.accent}'/><circle cx='20' cy='19' r='1.3' fill='${t.accent}'/></svg>`;
        case "client":
            return `<svg ${common}><rect x='5' y='5' width='20' height='14' rx='2.5' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.3'/><path d='M12 24h6M15 19v5' stroke='${t.stroke}' stroke-width='1.4' stroke-linecap='round'/><rect x='8' y='8' width='14' height='8' rx='1.5' fill='#eef2f7'/><path d='M10 14l4-4 3 3 2-2 2 3' stroke='${t.accent}' stroke-width='1.1' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
        case "bgp-router":
        case "router":
            return `<svg ${common}><circle cx='15' cy='15' r='12' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.5'/><circle cx='15' cy='15' r='3' fill='${t.accent}'/><path d='M15 5v6M15 19v6M5 15h6M19 15h6' stroke='${t.stroke}' stroke-width='1.4' stroke-linecap='round'/><path d='M12 8l3-3 3 3M12 22l3 3 3-3M8 12l-3 3 3 3M22 12l3 3-3 3' fill='none' stroke='${t.accent}' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
        case "dns-root":
        case "dns-asn":
        case "dns-local":
            return `<svg ${common}><circle cx='15' cy='15' r='12' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.5'/><ellipse cx='15' cy='15' rx='5' ry='12' fill='none' stroke='${t.accent}' stroke-width='1'/><path d='M3 15h24M5 10h20M5 20h20' stroke='${t.accent}' stroke-width='1' opacity='0.75'/></svg>`;
        default:
            return `<svg ${common}><circle cx='15' cy='15' r='12' fill='${t.fill}' stroke='${t.stroke}' stroke-width='1.5'/></svg>`;
    }
}

// Expand hull points outward from their centroid by `pad` pixels.
function expand_hull(points, pad = 28) {
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    return points.map(([x, y]) => {
        const dx = x - cx, dy = y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return [x + (dx / len) * pad, y + (dy / len) * pad];
    });
}

function leaf_parent_force(nodes, strength = 0.028) {
    let node_by_id = new Map();

    function force(alpha) {
        for (const node of nodes) {
            if (!node._layout_parent_id) continue;
            const parent = node_by_id.get(node._layout_parent_id);
            if (!parent) continue;
            node.vx += (parent.x - node.x) * strength * alpha;
            node.vy += (parent.y - node.y) * strength * alpha;
        }
    }

    force.initialize = (next_nodes) => {
        node_by_id = new Map(next_nodes.map(node => [node.id, node]));
    };

    return force;
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export default class Renderer {
    link
    nodes
    svg
    parent
    asn_hulls   // D3 selection for ASN background paths
    network     // stored so sim_tick can access node/link data
    packet_canvas
    packet_ctx
    packet_raf = null
    active_packets = []
    view_box = null
    show_blocked_ports = false
    _stp_roots = new Map()
    _blocked_markers = new Map()   // "link_id:f|r" → d3 circle selection
    _blocked_group                 // <g> that holds all blocked-port markers
    on_node_click = null           // set by Network.js; called with info object on node click

    constructor(options = {}) {
        this.options = options;
        this.sim_tick = this.sim_tick.bind(this);
        this._draw_packets = this._draw_packets.bind(this);
    }

    // Called by Port.block() / Port.unblock().
    // reversed=false → this port is at the source (start) of the link.
    // reversed=true  → this port is at the target (end) of the link.
    set_port_blocked(link_id, reversed, is_blocked) {
        if (!this._blocked_group) return;
        const key = link_id + (reversed ? ':r' : ':f');
        if (is_blocked) {
            if (this._blocked_markers.has(key)) return;
            // Resolve position now — nodes are static once the D3 sim has ended.
            const link_el = this.svg.select('#' + link_id);
            if (link_el.empty()) return;
            const d = link_el.datum();
            const t = reversed ? 0.75 : 0.25;
            const cx = d.source.x + t * (d.target.x - d.source.x);
            const cy = d.source.y + t * (d.target.y - d.source.y);
            const marker = this._blocked_group
                .append("circle")
                .attr("r", 5 * VISUAL_SCALE)
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("fill", "#dc2626")
                .attr("stroke", "#fff7ed")
                .attr("stroke-width", 1.5 * VISUAL_SCALE)
                .attr("pointer-events", "none")
                .style("display", this.show_blocked_ports ? null : "none");
            this._blocked_markers.set(key, marker);
        } else {
            const m = this._blocked_markers.get(key);
            if (m) { m.remove(); this._blocked_markers.delete(key); }
        }
    }

    set_blocked_ports_visible(visible) {
        this.show_blocked_ports = visible;
        if (!this._blocked_group) return;
        this._blocked_group.style("display", visible ? null : "none");
        for (const marker of this._blocked_markers.values()) {
            marker.style("display", visible ? null : "none");
        }
        for (const [node_id, is_root] of this._stp_roots.entries()) {
            this.svg.select('#' + node_id)
                .style("filter", visible && is_root ? `drop-shadow(0 0 ${7 * VISUAL_SCALE}px #ca8a04)` : null);
        }
    }

    icon_offset = {
        "switch":     { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "server":     { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "client":     { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "router":     { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "bgp-router": { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "dns-root":   { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "dns-asn":    { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
        "dns-local":  { "x": -ICON_SIZE / 2, "y": -ICON_SIZE / 2 },
    }

    anim_packet(link_id, color, speed, reversed) {
        if (!this.svg) return;
        let link_el = this.svg.select("#" + link_id);
        if (link_el.empty()) return;
        let link = link_el.datum();

        let start = { x: link.source.x, y: link.source.y };
        let end   = { x: link.target.x, y: link.target.y };

        if (reversed) {
            let tmp = end; end = start; start = tmp;
        }

        const opacity = _is_relevant(color, SimMode.getMode()) ? 1.0 : 0.06;

        this.active_packets.push({
            start,
            end,
            color,
            opacity,
            duration: speed,
            started_at: performance.now(),
        });

        if (this.packet_raf == null) {
            this.packet_raf = requestAnimationFrame(this._draw_packets);
        }
    }

    _resize_packet_canvas() {
        if (!this.packet_canvas) return null;

        const canvas = this.packet_canvas.node();
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        return { canvas, rect, dpr };
    }

    _packet_to_screen(point, rect) {
        if (!this.view_box) return point;

        const scale = Math.min(
            rect.width / this.view_box.width,
            rect.height / this.view_box.height
        );
        const offset_x = (rect.width - this.view_box.width * scale) / 2;
        const offset_y = (rect.height - this.view_box.height * scale) / 2;

        return {
            x: offset_x + (point.x - this.view_box.x) * scale,
            y: offset_y + (point.y - this.view_box.y) * scale,
            scale,
        };
    }

    _draw_packets(now) {
        this.packet_raf = null;

        if (!this.packet_ctx || this.active_packets.length === 0) return;

        const sizing = this._resize_packet_canvas();
        if (!sizing) return;

        const { rect, dpr } = sizing;
        const ctx = this.packet_ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const remaining = [];
        for (const packet of this.active_packets) {
            const t = Math.min(1, Math.max(0, (now - packet.started_at) / packet.duration));

            if (t < 1) remaining.push(packet);

            const x = packet.start.x + (packet.end.x - packet.start.x) * t;
            const y = packet.start.y + (packet.end.y - packet.start.y) * t;
            const screen = this._packet_to_screen({ x, y }, rect);

            ctx.globalAlpha = packet.opacity;
            ctx.fillStyle = packet.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, Config.PACKET_SIZE * screen.scale, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        this.active_packets = remaining;

        if (this.active_packets.length > 0) {
            this.packet_raf = requestAnimationFrame(this._draw_packets);
        } else {
            ctx.clearRect(0, 0, rect.width, rect.height);
        }
    }

    // Highlight the STP root bridge with a golden background tint.
    set_stp_root(node_id, is_root) {
        if (!this.svg) return;
        this._stp_roots.set(node_id, is_root);
        this.svg.select('#' + node_id)
            .style("filter", is_root && this.show_blocked_ports ? `drop-shadow(0 0 ${7 * VISUAL_SCALE}px #ca8a04)` : null);
    }

    // Highlight a node with the site accent (used by routing/dns/tcp modes).
    set_node_highlighted(node_id, on) {
        if (!this.svg) return;
        this.svg.select('#' + node_id)
            .style("filter", on ? `drop-shadow(0 0 ${7 * VISUAL_SCALE}px #0d9488)` : null);
    }

    register_event(id, event, func) {
        let svg = d3.select("#" + Config.NETWORK_SVG_REF);
        let obj = svg.select("#" + id).node();
        if (obj) obj.addEventListener(event, func);
    }

    get_icon(name) {
        return themed_icon(name);
    }

    _annotate_leaf_parents(network) {
        const node_by_id = new Map(network.nodes.map(node => [node.id, node]));

        for (const node of network.nodes) {
            delete node._layout_parent_id;
        }

        for (const link of network.links) {
            const source = endpoint_node(link.source, node_by_id);
            const target = endpoint_node(link.target, node_by_id);
            if (!source || !target) continue;

            if (is_leaf_node(source) && !is_leaf_node(target)) {
                source._layout_parent_id = target.id;
            } else if (is_leaf_node(target) && !is_leaf_node(source)) {
                target._layout_parent_id = source.id;
            }
        }

        return node_by_id;
    }

    _find_open_position(anchor, preferred_angle, base_radius, occupied, min_distance = NODE_MIN_DISTANCE) {
        const angle_offsets = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, Math.PI];

        for (let radius = base_radius; radius <= LEAF_MAX_RADIUS; radius += 12) {
            for (const offset of angle_offsets) {
                const angle = preferred_angle + offset;
                const candidate = {
                    x: anchor.x + Math.cos(angle) * radius,
                    y: anchor.y + Math.sin(angle) * radius,
                };

                if (occupied.every(point => distance(candidate, point) >= min_distance)) {
                    return candidate;
                }
            }
        }

        // Last-resort spiral. This keeps the no-overlap guarantee even for a dense random subnet.
        for (let i = 0; i < 96; i++) {
            const angle = preferred_angle + i * 0.72;
            const radius = LEAF_MAX_RADIUS + 10 + i * 4;
            const candidate = {
                x: anchor.x + Math.cos(angle) * radius,
                y: anchor.y + Math.sin(angle) * radius,
            };

            if (occupied.every(point => distance(candidate, point) >= min_distance)) {
                return candidate;
            }
        }

        return {
            x: anchor.x + Math.cos(preferred_angle) * (LEAF_MAX_RADIUS + 120),
            y: anchor.y + Math.sin(preferred_angle) * (LEAF_MAX_RADIUS + 120),
        };
    }

    _place_leaf_nodes(network, subnet_centers, asn_centers) {
        const node_by_id = new Map(network.nodes.map(node => [node.id, node]));
        const leaves_by_parent = new Map();
        const occupied = network.nodes
            .filter(node => !is_leaf_node(node) && Number.isFinite(node.x) && Number.isFinite(node.y))
            .map(node => ({ x: node.x, y: node.y }));

        for (const node of network.nodes) {
            if (!node._layout_parent_id) continue;
            if (!leaves_by_parent.has(node._layout_parent_id)) {
                leaves_by_parent.set(node._layout_parent_id, []);
            }
            leaves_by_parent.get(node._layout_parent_id).push(node);
        }

        for (const [parent_id, leaves] of leaves_by_parent.entries()) {
            const parent = node_by_id.get(parent_id);
            if (!parent) continue;

            leaves.sort((a, b) => a.id.localeCompare(b.id));

            const center = subnet_centers[parent.subnet] || asn_centers[parent.asn] || parent;
            const base_angle = Math.atan2(parent.y - center.y, parent.x - center.x);
            const span = Math.min(Math.PI * 0.92, Math.PI * 0.28 * Math.max(1, leaves.length - 1));

            leaves.forEach((leaf, index) => {
                const offset = leaves.length === 1
                    ? 0
                    : -span / 2 + (span * index) / (leaves.length - 1);
                const position = this._find_open_position(parent, base_angle + offset, LEAF_BASE_RADIUS, occupied);

                leaf.x = position.x;
                leaf.y = position.y;
                leaf.vx = 0;
                leaf.vy = 0;
                occupied.push({ x: leaf.x, y: leaf.y });
            });
        }
    }

    _resolve_remaining_overlaps(nodes, min_distance = NODE_MIN_DISTANCE) {
        for (let pass = 0; pass < 160; pass++) {
            let moved = false;

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist >= min_distance) continue;

                    if (dist === 0) {
                        const angle = ((i + j) * 137.5 * Math.PI) / 180;
                        dx = Math.cos(angle);
                        dy = Math.sin(angle);
                        dist = 1;
                    }

                    const push = (min_distance - dist) / 2 + 0.5;
                    const ux = dx / dist;
                    const uy = dy / dist;

                    a.x -= ux * push;
                    a.y -= uy * push;
                    b.x += ux * push;
                    b.y += uy * push;
                    a.vx = 0;
                    a.vy = 0;
                    b.vx = 0;
                    b.vy = 0;
                    moved = true;
                }
            }

            if (!moved) break;
        }
    }

    draw_network(svg_id, network, callback) {
        this.network = network;
        this.parent = d3.select(svg_id);
        const node_by_id = this._annotate_leaf_parents(network);

        const x_max = 2 * this.parent.node().offsetWidth;
        const y_max = 2 * this.parent.node().offsetHeight;

        this.svg = this.parent
            .append("svg")
            .attr("id", Config.NETWORK_SVG_REF)
            .attr("preserveAspectRatio", "xMidYMid meet");

        this.packet_canvas = this.parent
            .append("canvas")
            .attr("class", "packet-layer");
        this.packet_ctx = this.packet_canvas.node().getContext("2d");

        // SVG element order (bottom → top): hulls → links → nodes → labels → packet animations.

        // --- ASN hull backgrounds ---
        const asn_ids = [...new Set(network.nodes.map(n => n.asn).filter(a => a !== undefined && a !== null))];
        this.asn_hulls = this.svg.selectAll(".asn-hull")
            .data(asn_ids)
            .enter()
            .append("path")
            .attr("class", "asn-hull")
            .attr("fill",           a => ASN_COLORS[a % ASN_COLORS.length])
            .attr("stroke",         a => ASN_STROKE[a % ASN_STROKE.length])
            .attr("stroke-width",   1.5)
            .attr("stroke-dasharray", "6 3")
            .attr("stroke-linejoin", "round");

        // --- Links (above hulls) ---
        this.link = this.svg
            .selectAll("line")
            .data(network.links)
            .enter()
            .append("line")
            .style("stroke",         d => d.is_peering ? Config.BGP_COLOR : Config.LINK_COLOR)
            .style("stroke-dasharray", d => d.is_peering ? "8 4" : null)
            .style("stroke-width",   d => d.is_peering ? 1.5 : 1)
            .attr("id", d => d.id);

        // --- Nodes (above links) ---
        this.nodes = this.svg
            .selectAll(".net-node")
            .data(network.nodes)
            .enter()
            .append("svg")
            .attr("class", "net-node")
            .html(d => this.get_icon(d.type))
            .style("filter", "drop-shadow(0 1px 2px rgba(28, 25, 23, 0.16))")
            .attr("id", d => d.id);

        // --- Blocked-port markers (above nodes) ---
        this._blocked_group = this.svg.append("g").attr("id", "blocked-ports");

        // --- ASN labels (topmost, added last) ---
        this.svg.selectAll(".asn-label")
            .data(asn_ids)
            .enter()
            .append("text")
            .attr("class", "asn-label")
            .attr("fill",        a => ASN_STROKE[a % ASN_STROKE.length])
            .attr("font-size",   11)
            .attr("font-weight", "bold")
            .attr("font-family", "'IBM Plex Mono', monospace")
            .text(a => `ASN ${a}`);

        // Two-level layout: ASNs are separated first, then subnets are placed
        // around their ASN center. D3 keeps the node placement organic; a small
        // leaf pass below only prevents hosts from drifting far from next hops.
        const cx = x_max / 2, cy = y_max / 2;
        const ASN_RADIUS    = this.options.asnRadius ?? (asn_ids.length === 2 ? 360 : 340);
        const SUBNET_RADIUS = this.options.subnetRadius ?? 195;

        // ASN centers: evenly spaced on a circle
        const asn_centers = {};
        asn_ids.forEach((asn, i) => {
            const angle = asn_ids.length === 2
                ? Math.PI * i
                : (2 * Math.PI * i / asn_ids.length) - Math.PI / 2;
            asn_centers[asn] = {
                x: cx + ASN_RADIUS * Math.cos(angle),
                y: cy + ASN_RADIUS * Math.sin(angle),
            };
        });

        // Subnet centers: evenly spaced on a smaller circle around their ASN center
        const subnet_centers = {};
        for (const asn of asn_ids) {
            const subnets = [...new Set(
                network.nodes.filter(n => n.asn === asn && n.subnet != null).map(n => n.subnet)
            )];
            const ac = asn_centers[asn];
            subnets.forEach((subnet, i) => {
                let angle = (2 * Math.PI * i / subnets.length) - Math.PI / 2;
                if (this.options.subnetSpreadAngle != null) {
                    const outward = Math.atan2(ac.y - cy, ac.x - cx);
                    const spread = this.options.subnetSpreadAngle;
                    angle = subnets.length === 1
                        ? outward
                        : outward - spread / 2 + (spread * i) / (subnets.length - 1);
                }
                subnet_centers[subnet] = {
                    x: ac.x + SUBNET_RADIUS * Math.cos(angle),
                    y: ac.y + SUBNET_RADIUS * Math.sin(angle),
                };
            });
        }

        // Seed positions so the simulation starts already separated
        for (const node of network.nodes) {
            const center = node.subnet != null ? subnet_centers[node.subnet]
                         : node.asn   != null ? asn_centers[node.asn]
                         : { x: cx, y: cy };
            node.x = center.x + (Math.random() - 0.5) * 40;
            node.y = center.y + (Math.random() - 0.5) * 40;
        }

        // Target position lookup used by the center forces below
        const target = (d) => d.subnet != null ? subnet_centers[d.subnet]
                             : d.asn   != null ? asn_centers[d.asn]
                             : { x: cx, y: cy };

        const simulation = d3.forceSimulation(network.nodes)
            .force("link", d3.forceLink()
                .id(d => d.id)
                .links(network.links)
                .distance(d => {
                    if (leaf_link_distance(d, node_by_id)) return LEAF_LINK_DISTANCE;
                    if (d.is_peering) return PEERING_LINK_DISTANCE;
                    if (d.is_internal) return INTERNAL_LINK_DISTANCE;
                    return LINK_DISTANCE;
                })
                .strength(1)
            )
            .force("charge", d3.forceManyBody().strength(-185))
            // Keep icons from overlapping while preserving the organic force layout.
            .force("collide", d3.forceCollide(COLLISION_RADIUS).strength(1))
            .force("leaf-parent", leaf_parent_force(network.nodes))
            .force("boundary", forceBoundary(0, 0, x_max, y_max))
            // Center forces keep subnet clusters readable without manually placing
            // routers/switches. BGP routers have no subnet so need a stronger pull.
            .force("cx", d3.forceX()
                .x(d => target(d).x)
                .strength(d => d.subnet != null ? 0.22 : d.asn != null ? 0.38 : 0)
            )
            .force("cy", d3.forceY()
                .y(d => target(d).y)
                .strength(d => d.subnet != null ? 0.22 : d.asn != null ? 0.38 : 0)
            )
            .on("tick", this.sim_tick);

        // More ticks needed since the weaker center forces take longer to converge.
        for (let i = 0; i < 500; i++) simulation.tick();
        simulation.stop();
        this._place_leaf_nodes(network, subnet_centers, asn_centers);
        this._resolve_remaining_overlaps(network.nodes);
        this.sim_tick();
        this.update_viewbox();
        callback();
    }

    sim_tick() {
        // Update link positions
        this.link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        // Update node positions
        this.nodes
            .attr("x", d => d.x + this.icon_offset[d.type]["x"])
            .attr("y", d => d.y + this.icon_offset[d.type]["y"]);

        // Update ASN convex hull backgrounds
        const nodes_by_asn = new Map();
        for (const node of this.network.nodes) {
            if (node.asn === undefined) continue;
            if (!nodes_by_asn.has(node.asn)) nodes_by_asn.set(node.asn, []);
            nodes_by_asn.get(node.asn).push([node.x, node.y]);
        }

        this.asn_hulls.attr("d", asn_id => {
            const pts = nodes_by_asn.get(asn_id);
            if (!pts || pts.length === 0) return "";
            let hull;
            if (pts.length === 1) {
                // Single point: small circle approximation
                const [x, y] = pts[0];
                const r = 30;
                hull = [[x, y - r], [x + r, y], [x, y + r], [x - r, y]];
            } else if (pts.length === 2) {
                // Two points: rectangle around them
                const pad = 25;
                hull = [
                    [pts[0][0] - pad, pts[0][1] - pad],
                    [pts[1][0] + pad, pts[0][1] - pad],
                    [pts[1][0] + pad, pts[1][1] + pad],
                    [pts[0][0] - pad, pts[1][1] + pad],
                ];
            } else {
                hull = d3.polygonHull(pts);
                if (!hull) return "";
                hull = expand_hull(hull);
            }
            return "M" + hull.map(p => p.join(",")).join("L") + "Z";
        });

        // Update ASN label positions (centroid of ASN nodes)
        this.svg.selectAll(".asn-label").attr("x", asn_id => {
            const pts = nodes_by_asn.get(asn_id);
            if (!pts || pts.length === 0) return 0;
            return pts.reduce((s, p) => s + p[0], 0) / pts.length;
        }).attr("y", asn_id => {
            const pts = nodes_by_asn.get(asn_id);
            if (!pts || pts.length === 0) return 0;
            // Place label above the centroid
            const min_y = Math.min(...pts.map(p => p[1]));
            return min_y - 35;
        });

    }

    update_viewbox() {
        if (!this.svg) return;
        const bbox = this.svg.node().getBBox();
        this.view_box = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
        this.svg.attr("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }

    destroy() {
        if (this.packet_raf != null) {
            cancelAnimationFrame(this.packet_raf);
            this.packet_raf = null;
        }
        this.active_packets = [];
    }
}
