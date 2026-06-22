import * as Config from '../helpers/config';

const PROTOCOL = 520;
const INFINITY  = 16;

// Simple RIP (distance-vector, split horizon, no poisoned reverse).
// Runs on every L3 Router; BGPRouter opts out by setting this.rip = null.
export default class RIP {
    parent
    _metrics  = {}   // normalized-prefix → best metric (1 = directly connected)
    _via_port = {}   // normalized-prefix → port index learned from (null = connected)
    _changed       = false
    _stable_rounds = 0
    converged      = false
    _timer         = null

    constructor(parent) {
        this.parent   = parent;
        this.receive  = this.receive.bind(this);
        this._tick    = this._tick.bind(this);
    }

    init() {
        this.parent.ip.register_protocol(PROTOCOL, this.receive);

        // Seed from directly-connected routes already installed by IPv4.init().
        for (const r of this.parent.ip.routing_table.get_routes()) {
            if (r.next_hop === null && r.prefix !== '0.0.0.0/0') {
                this._metrics[r.prefix]  = 1;
                this._via_port[r.prefix] = null;
            }
        }

        this._changed = true;
        this._schedule_tick();
    }

    receive(data, ip_header) {
        if (data.type !== 'UPDATE') return;

        // Which local port did this arrive on?
        const conn = this.parent.ip.routing_table.lookup(ip_header.src);
        if (!conn) return;
        const in_port = conn.port;

        let updated = false;
        for (const { prefix, metric } of data.routes) {
            if (prefix === '0.0.0.0/0') continue;          // never accept default via RIP
            const new_metric = metric + 1;
            if (new_metric >= INFINITY) continue;
            const cur = this._metrics[prefix];
            if (cur === undefined || new_metric < cur) {
                this._metrics[prefix]  = new_metric;
                this._via_port[prefix] = in_port;
                this.parent.ip.routing_table.add_route(prefix, ip_header.src, in_port);
                updated = true;
            }
        }
        if (updated) this._changed = true;
    }

    _schedule_tick() {
        if (this.converged) {
            // ±50 % jitter on the slow interval so timers can never re-synchronise.
            const delay = (0.5 + Math.random()) * Config.RIP_INTERVAL_SLOW * Config.sim.time_factor;
            this._timer = setTimeout(this._tick, delay);
        } else {
            this._timer = setTimeout(this._tick, Config.RIP_INTERVAL_FAST * Config.sim.time_factor);
        }
    }

    _tick() {
        if (this._changed) {
            this._stable_rounds = 0;
            this._changed       = false;
        } else {
            this._stable_rounds++;
        }

        const just_converged = !this.converged && this._stable_rounds >= 2;
        if (just_converged) this.converged = true;

        this._send_updates();

        if (just_converged) {
            // One-time random phase offset across the full slow interval so all routers
            // start their slow timers at different points and never fire in sync.
            this._timer = setTimeout(this._tick, Math.random() * Config.RIP_INTERVAL_SLOW);
        } else {
            this._schedule_tick();
        }
    }

    _send_updates() {
        for (let i = 0; i < this.parent.ports.length; i++) {
            const port = this.parent.ports[i];
            const peer = port.destination;
            if (!peer || peer.l3Addr.length === 0) continue;

            // Only send to neighbors that also run RIP (skip BGP uplinks etc.)
            const neighbor = peer.parent;
            if (!neighbor || !neighbor.rip) continue;

            const peer_ip = peer.get_l3addr_witout_subnet(0);

            // Split horizon: don't advertise a route back through the port it came in on.
            const routes = [];
            for (const [prefix, metric] of Object.entries(this._metrics)) {
                if (this._via_port[prefix] === i) continue;
                routes.push({ prefix, metric });
            }
            if (routes.length === 0) continue;

            this.parent.ip.send(
                { type: 'UPDATE', routes },
                peer_ip,
                PROTOCOL,
                Config.RIP_COLOR,
            );
        }
    }
}
