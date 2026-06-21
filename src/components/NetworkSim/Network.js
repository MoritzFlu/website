import './Network.css';

import React from "react";
import Server from './Server';
import Client from './Client';
import Switch from './Switch';
import Router from './Router';
import BGPRouter from './BGPRouter';
import DNSNode from './DNSNode';
import LocalDNSNode from './LocalDNSNode';
import Renderer from './Renderer.js';

import shuffle from "shuffle-array";
import * as Config from './config';
import * as SimMode from './SimMode';

// Module-level counter so link IDs are globally unique across network instances.
// Prevents old simulation timers from accidentally animating on a new network's SVG.
let _global_link_counter = 0;

class NetworkSim extends React.Component {

    network          = {};
    sim_nodes        = [];
    hostname_registry = [];
    renderer

    componentDidMount() {
        this._mounted = true;
        this.init          = this.init.bind(this);
        this._start_traffic = this._start_traffic.bind(this);

        this.sim_nodes = [];
        this.renderer  = new Renderer(this.props.layout || {});

        // Reset shared time scale so a second mount starts fast regardless of
        // what the previous Network instance left behind.
        Config.sim.time_factor = 0.01;

        this.renderer.on_node_click = (info) => {
            if (this.props.onNodeClick) this.props.onNodeClick(info);
        };

        if (this.props.deferStart) {
            this._start_frame = requestAnimationFrame(() => {
                this._start_frame = requestAnimationFrame(() => this._mount_network());
            });
        } else {
            this._mount_network();
        }

        this._mode_unsub = SimMode.subscribe((mode) => this._apply_mode_highlights(mode));
    }

    _mount_network() {
        if (!this._mounted) return;
        this.genNetwork();
        this.renderer.draw_network('#network', this.network, this.init);
    }

    componentWillUnmount() {
        this._mounted = false;
        if (this._start_frame) cancelAnimationFrame(this._start_frame);
        if (this._traffic_interval) clearInterval(this._traffic_interval);
        if (this._mode_unsub) this._mode_unsub();
        if (this.renderer) this.renderer.destroy();
    }

    _apply_mode_highlights(mode) {
        for (const n of this.sim_nodes) {
            this.renderer.set_node_highlighted(n.id, false);
            if (n.type === 'switch') this.renderer.set_stp_root(n.id, n.stp?.is_root ?? false);
        }
        const highlight = (types) => this.sim_nodes
            .filter(n => types.includes(n.type))
            .forEach(n => this.renderer.set_node_highlighted(n.id, true));
        if (mode === 'routing') {
            highlight(['router', 'bgp-router']);
        } else if (mode === 'dns') {
            highlight(['dns-root', 'dns-asn', 'dns-local']);
        } else if (mode === 'tcp') {
            highlight(['client', 'server']);
        }
    }

    init() {
        const jitter = () => Math.random() * Config.MAX_STARTUP_DELAY * Config.sim.time_factor;

        const switches = this.sim_nodes.filter(n => n.type === 'switch');
        const routers  = this.sim_nodes.filter(n => n.type === 'router' || n.type === 'bgp-router');
        const hosts    = this.sim_nodes.filter(n => n.type !== 'switch' && n.type !== 'router' && n.type !== 'bgp-router');

        // Phase 1 (0–100 ms): switches only — STP converges on a quiet network.
        for (const n of switches) setTimeout(n.init, jitter());

        // Phase 2 (100–200 ms): L3 routers + BGP routers — RIP and BGP converge
        // after STP has already produced a stable, loop-free L2 topology.
        for (const n of routers) setTimeout(n.init, 100 + jitter());

        // Phase 3 (200 ms): clients, servers, DNS nodes — ARP/TCP/DNS can now
        // rely on a fully converged L2+L3 fabric.
        for (const n of hosts) setTimeout(n.init, 200 + jitter());

        // Start traffic 100 ms after hosts are up (allow ARP tables to populate).
        setTimeout(this._start_traffic, 300);
    }

    _start_traffic() {
        if (!this._mounted) return;
        Config.sim.time_factor = 1.0;

        const clients = this.sim_nodes.filter(n => n.type === 'client');
        if (clients.length === 0 || this.hostname_registry.length === 0) return;

        const registry = this.hostname_registry;
        const rand_pick = arr => arr[Math.floor(Math.random() * arr.length)];

        // Token bucket: starts full so the burst fires immediately after startup.
        let tokens = Config.DNS_BURST_SIZE;

        const fire_request = () => {
            if (!this._mounted) return;
            const client = rand_pick(clients);
            const entry  = rand_pick(registry);
            client.do_request_for(entry.fqdn);
        };

        const drain = () => {
            while (tokens > 0) { tokens--; fire_request(); }
        };

        // Immediate wave: direct TCP to pre-resolved IPs so the SVG lights up before
        // the DNS burst resolves. Pick random client + hostname each time.
        const direct_count = Math.min(Config.DNS_BURST_SIZE, registry.length);
        for (let i = 0; i < direct_count; i++) {
            const entry = rand_pick(registry);
            setTimeout(() => rand_pick(clients).do_direct_request(entry.ip, entry.fqdn, true),
                       i * 300 + Math.random() * 150);
        }

        // Drain the full initial bucket right away — this is the startup burst.
        drain();

        // Refill one token per interval and drain immediately.
        this._traffic_interval = setInterval(() => {
            if (!this._mounted) return;
            if (tokens < Config.DNS_BURST_SIZE) tokens++;
            drain();
        }, Config.DNS_REQUEST_INTERVAL);
    }

    genNetwork() {
        this.network  = { nodes: [], links: [] };
        this.sim_nodes = [];

        const limits = this.props.limits || {};
        const NUM_ASNS = this.props.asnCount ?? Config.NUM_ASNS;
        const MIN_ROUTERS_PER_ASN = limits.minRoutersPerAsn ?? Config.MIN_ROUTERS_PER_ASN;
        const MAX_ROUTERS_PER_ASN = limits.maxRoutersPerAsn ?? Config.MAX_ROUTERS_PER_ASN;
        const MIN_SWITCHES_PER_SUBNET = limits.minSwitchesPerSubnet ?? Config.MIN_SWITCHES_PER_SUBNET;
        const MAX_SWITCHES_PER_SUBNET = limits.maxSwitchesPerSubnet ?? Config.MAX_SWITCHES_PER_SUBNET;
        const MIN_SERVERS_PER_SUBNET = limits.minServersPerSubnet ?? Config.MIN_SERVERS_PER_SUBNET;
        const MAX_SERVERS_PER_SUBNET = limits.maxServersPerSubnet ?? Config.MAX_SERVERS_PER_SUBNET;
        const MIN_CLIENTS_PER_SUBNET = limits.minClientsPerSubnet ?? Config.MIN_CLIENTS_PER_SUBNET;
        const MAX_CLIENTS_PER_SUBNET = limits.maxClientsPerSubnet ?? Config.MAX_CLIENTS_PER_SUBNET;

        const rand_range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const next_lid  = () => "link" + _global_link_counter++;

        const rand_speed = () =>
            Math.random() * (Config.MAX_LINK_SPEED - Config.MIN_LINK_SPEED) + Config.MIN_LINK_SPEED;

        const add_node = (node, extra = {}) => {
            this.sim_nodes.push(node);
            this.network.nodes.push({ id: node.id, type: node.type, ...extra });
        };

        // Pre-populate ARP tables for both ends of a router P2P link so the first
        // packet isn't delayed by an ARP round-trip.  Call after add_l3addr() on both ports.
        const seed_arp_pair = (nodeA, portA, nodeB, portB) => {
            const ipA = portA.l3Addr.length > 0 ? portA.get_l3addr_witout_subnet(0) : null;
            const ipB = portB.l3Addr.length > 0 ? portB.get_l3addr_witout_subnet(0) : null;
            if (nodeA.arp && ipB) nodeA.arp.seed_arp(ipB, portB.l2Addr);
            if (nodeB.arp && ipA) nodeB.arp.seed_arp(ipA, portA.l2Addr);
        };

        const connect = (src, dst, extra = {}) => {
            const lid      = next_lid();
            const link_obj = { id: lid, source: src.id, target: dst.id, ...extra };
            this.network.links.push(link_obj);
            return src.add_connection(dst, rand_speed(), link_obj, this.renderer);
        };

        // hostname_registry: all resolvable FQDNs; stored on component and passed to every client
        this.hostname_registry = [];
        const hostname_registry = this.hostname_registry;

        // asn_bgp_routers[a] → BGPRouter for ASN a
        const asn_bgp_routers = [];

        // asn_dns_nodes[a] → DNSNode ("dns-asn") for ASN a
        const asn_dns_nodes = [];

        for (let a = 0; a < NUM_ASNS; a++) {
            const NUM_RTRS = rand_range(MIN_ROUTERS_PER_ASN, MAX_ROUTERS_PER_ASN);
            // IP plan for ASN a:
            //   Subnet r:             10.{a}.{r}.0/24
            //   L3 router gateway:    10.{a}.{r}.254/24
            //   Servers:              10.{a}.{r}.100+  (first = also Subnet DNS)
            //   Clients:              10.{a}.{r}.1+
            //   ASN DNS ↔ rtr0:       10.{a}.252.1/30 (DNS) · 10.{a}.252.2/30 (rtr0)
            //   L3→BGP uplink:        10.{a}.255.{r*4+1}/30 (L3 side)
            //                         10.{a}.255.{r*4+2}/30 (BGP side)
            //   Intra-ASN L3 links:   10.{a}.253.{pair*4+1}/30  (RIP-routed)

            const bgp = new BGPRouter(`asn${a}-bgp`, this.renderer, a);
            bgp.asn = a;
            add_node(bgp, { asn: a, subnet: null });
            asn_bgp_routers.push(bgp);

            const asn_l3_routers = [];

            // Zones to register on the ASN DNS after it's created
            const asn_dns_zone_queue = [];

            for (let r = 0; r < NUM_RTRS; r++) {
                const NS = rand_range(MIN_SWITCHES_PER_SUBNET, MAX_SWITCHES_PER_SUBNET);
                const NR = rand_range(MIN_SERVERS_PER_SUBNET,  MAX_SERVERS_PER_SUBNET);
                const NC = rand_range(MIN_CLIENTS_PER_SUBNET,  MAX_CLIENTS_PER_SUBNET);
                const subnet_id    = `${a}-${r}`;
                const L2_SUBNET    = `10.${a}.${r}.0/24`;
                const GATEWAY      = `10.${a}.${r}.254`;
                const RTR_UP_CIDR  = `10.${a}.255.${r * 4 + 1}/30`;
                const BGP_DOWN_CIDR = `10.${a}.255.${r * 4 + 2}/30`;
                const BGP_DOWN_IP  = `10.${a}.255.${r * 4 + 2}`;

                // --- Switch fabric ---
                const asn_switches = [];
                for (let i = 0; i < NS; i++) {
                    const sw = new Switch(`asn${a}-rtr${r}-sw${i}`, this.renderer);
                    sw.asn = a; sw.subnet = subnet_id;
                    add_node(sw, { asn: a, subnet: subnet_id });
                    asn_switches.push(sw);
                }

                // Pruned random mesh between switches
                const candidates = [];
                for (let i = 0; i < NS; i++)
                    for (let j = i + 1; j < NS; j++)
                        candidates.push({ src: asn_switches[i], dst: asn_switches[j] });
                shuffle(candidates);

                const sw_deg = new Map();
                const inc = id => sw_deg.set(id, (sw_deg.get(id) || 0) + 1);
                const pending = [];
                for (const c of candidates) {
                    const max = Math.floor(Math.random() * 2) + 2;
                    if ((sw_deg.get(c.src.id) || 0) < max && (sw_deg.get(c.dst.id) || 0) < max) {
                        pending.push(c); inc(c.src.id); inc(c.dst.id);
                    }
                }
                for (const sw of asn_switches) {
                    if (!(sw_deg.get(sw.id) > 0)) {
                        const target = asn_switches.find(s => s.id !== sw.id);
                        if (target) { pending.push({ src: sw, dst: target }); inc(sw.id); inc(target.id); }
                    }
                }
                for (const p of pending) connect(p.src, p.dst, { asn: a, subnet: subnet_id });

                // --- Subnet DNS node (dedicated leaf node at .200) ---
                const local_dns = new LocalDNSNode(`asn${a}-rtr${r}-dns`, this.renderer);
                local_dns.asn = a; local_dns.subnet = subnet_id;
                add_node(local_dns, { asn: a, subnet: subnet_id });
                const [local_dns_port] = connect(local_dns, asn_switches[Math.floor(Math.random() * NS)], { asn: a, subnet: subnet_id });
                local_dns_port.add_l3addr(`10.${a}.${r}.200/24`);
                local_dns.ip.routing_table.add_route("0.0.0.0/0", GATEWAY, 0);

                // --- Servers ---
                const subnet_servers = [];
                const names = shuffle(Config.HOSTNAMES.slice()).slice(0, NR);
                for (let i = 0; i < NR; i++) {
                    const srv = new Server(`asn${a}-rtr${r}-srv${i}`, this.renderer);
                    srv.asn = a; srv.subnet = subnet_id;
                    add_node(srv, { asn: a, subnet: subnet_id });
                    const [srv_port] = connect(srv, asn_switches[Math.floor(Math.random() * NS)], { asn: a, subnet: subnet_id });
                    const srv_ip = `10.${a}.${r}.${100 + i}`;
                    srv_port.add_l3addr(`${srv_ip}/24`);
                    srv.ip.routing_table.add_route("0.0.0.0/0", GATEWAY, 0);
                    const fqdn = `${names[i]}.sub-${r}.asn-${a}`;
                    srv.fqdn = fqdn;
                    local_dns._pending_zones.push({ fqdn, ip: srv_ip });
                    hostname_registry.push({ fqdn, ip: srv_ip });
                    subnet_servers.push(srv);
                }

                // Queue record for ASN DNS: sub-{r}.asn-{a} → 10.{a}.{r}.200 (local DNS)
                asn_dns_zone_queue.push({ label: `sub-${r}.asn-${a}`, ip: `10.${a}.${r}.200` });

                // --- Clients ---
                for (let i = 0; i < NC; i++) {
                    const cli = new Client(`asn${a}-rtr${r}-cli${i}`, this.renderer);
                    cli.asn = a; cli.subnet = subnet_id;
                    add_node(cli, { asn: a, subnet: subnet_id });
                    const [cli_port] = connect(cli, asn_switches[Math.floor(Math.random() * NS)], { asn: a, subnet: subnet_id });
                    cli_port.add_l3addr(`10.${a}.${r}.${1 + i}/24`);
                    cli.ip.routing_table.add_route("0.0.0.0/0", GATEWAY, 0);
                }

                // --- L3 router ---
                const rtr = new Router(`asn${a}-rtr${r}`, this.renderer);
                rtr.asn = a; rtr.subnet = subnet_id;
                add_node(rtr, { asn: a, subnet: subnet_id });

                // Port 0: L2-facing
                const [rtr_l2_port] = connect(rtr, asn_switches[Math.floor(Math.random() * NS)], { asn: a, subnet: subnet_id });
                rtr_l2_port.add_l3addr(`${GATEWAY}/24`);

                // Port 1: BGP uplink
                const bgp_port_idx = bgp.ports.length;
                const [rtr_up_port, bgp_down_port] = connect(rtr, bgp, { asn: a, is_internal: true });
                rtr_up_port.add_l3addr(RTR_UP_CIDR);
                bgp_down_port.add_l3addr(BGP_DOWN_CIDR);
                seed_arp_pair(rtr, rtr_up_port, bgp, bgp_down_port);

                // Default route: inter-ASN traffic goes up to BGP router.
                // RIP handles all intra-ASN routes; only the default is static.
                rtr.ip.routing_table.add_route("0.0.0.0/0", BGP_DOWN_IP, 1);

                // BGP router: route to this subnet (BGP does not run RIP)
                bgp.ip.routing_table.add_route(L2_SUBNET, `10.${a}.255.${r * 4 + 1}`, bgp_port_idx);

                // --- ASN DNS node (once per ASN, connected directly to rtr0 via /30) ---
                if (r === 0) {
                    const asn_dns = new DNSNode(`asn${a}-dns`, this.renderer, "dns-asn");
                    asn_dns.asn = a; asn_dns.subnet = null;
                    add_node(asn_dns, { asn: a, subnet: null });

                    // Point-to-point link: 10.{a}.252.1 (DNS) ↔ 10.{a}.252.2 (rtr0)
                    const [dns_port, rtr_dns_port] = connect(asn_dns, rtr, { asn: a, is_internal: true });
                    dns_port.add_l3addr(`10.${a}.252.1/30`);
                    rtr_dns_port.add_l3addr(`10.${a}.252.2/30`);
                    seed_arp_pair(asn_dns, dns_port, rtr, rtr_dns_port);

                    // DNS node only needs a default route; RIP will advertise its /30 to peers
                    asn_dns.ip.routing_table.add_route("0.0.0.0/0", `10.${a}.252.2`, 0);

                    // BGP router needs a static route to reach the DNS /30 for cross-ASN queries
                    bgp.ip.routing_table.add_route(`10.${a}.252.0/30`, `10.${a}.255.1`, bgp_port_idx);

                    asn_dns_nodes.push(asn_dns);
                }

                asn_l3_routers.push({ rtr, r });
            }

            // Register all subnet records on the ASN DNS now that we know them all
            const asn_dns = asn_dns_nodes[a];
            for (const z of asn_dns_zone_queue) {
                asn_dns.register_ns(z.label, z.ip);
            }

            // --- Interconnect L3 routers within this ASN ---
            // Static routes between routers are replaced by RIP; only /30 addresses needed.
            let pair_idx = 0;
            for (let i = 0; i < asn_l3_routers.length; i++) {
                for (let j = i + 1; j < asn_l3_routers.length; j++) {
                    const { rtr: rtr_i } = asn_l3_routers[i];
                    const { rtr: rtr_j } = asn_l3_routers[j];

                    const [port_i, port_j] = connect(rtr_i, rtr_j, { asn: a, is_internal: true });

                    port_i.add_l3addr(`10.${a}.253.${pair_idx * 4 + 1}/30`);
                    port_j.add_l3addr(`10.${a}.253.${pair_idx * 4 + 2}/30`);
                    seed_arp_pair(rtr_i, port_i, rtr_j, port_j);

                    pair_idx++;
                }
            }
        }

        // --- Root DNS node (central, outside all ASN hulls) ---
        const root_dns = new DNSNode("root-dns", this.renderer, "dns-root");
        add_node(root_dns, { asn: null, subnet: null });

        for (let a = 0; a < NUM_ASNS; a++) {
            const bgp = asn_bgp_routers[a];
            const root_port_idx = root_dns.ports.length;
            const bgp_port_idx  = bgp.ports.length;

            const [root_port, bgp_port] = connect(root_dns, bgp, { is_peering: true });
            root_port.add_l3addr(`172.16.${a}.1/24`);
            bgp_port.add_l3addr(`172.16.${a}.2/24`);
            seed_arp_pair(root_dns, root_port, bgp, bgp_port);

            // Root DNS: route packets for this ASN's supernet outward
            root_dns.ip.routing_table.add_route(`10.${a}.0.0/16`, `172.16.${a}.2`, root_port_idx);

            // Root DNS: zone record: asn-{a} → ASN DNS IP (10.{a}.252.1)
            root_dns.register_ns(`asn-${a}`, `10.${a}.252.1`);

            // BGP router: route back to root DNS link
            bgp.ip.routing_table.add_route(`172.16.${a}.0/24`, null, bgp_port_idx);
        }

        // --- Inter-ASN peering links (BGP routers talk to each other) ---
        let p = 0;
        for (let a = 0; a < NUM_ASNS; a++) {
            for (let b = a + 1; b < NUM_ASNS; b++) {
                const bgp_a = asn_bgp_routers[a];
                const bgp_b = asn_bgp_routers[b];

                const a_port_idx = bgp_a.ports.length;
                const b_port_idx = bgp_b.ports.length;

                const [a_port, b_port] = connect(bgp_a, bgp_b, { is_peering: true });
                a_port.add_l3addr(`100.64.${p}.1/30`);
                b_port.add_l3addr(`100.64.${p}.2/30`);
                seed_arp_pair(bgp_a, a_port, bgp_b, b_port);

                bgp_a.register_peer(bgp_b, a_port_idx);
                bgp_b.register_peer(bgp_a, b_port_idx);

                p++;
            }
        }

        // --- Wire client root_dns_ip and hostname_registry ---
        for (const node of this.sim_nodes) {
            if (node.type === "client") {
                node.root_dns_ip       = `172.16.${node.asn}.1`;
                node.hostname_registry = hostname_registry;
            }
        }
    }

    render() {
        return <div id="network" />;
    }
}

export default NetworkSim;
