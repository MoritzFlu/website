import * as Config from './config';

// BGP message types
const MSG_OPEN         = 1;
const MSG_UPDATE       = 2;
const MSG_NOTIFICATION = 3;
const MSG_KEEPALIVE    = 4;

// BGP FSM states (simplified: no Connect/Active — we assume the link is always up)
const STATE_IDLE        = "IDLE";
const STATE_OPEN_SENT   = "OPEN_SENT";
const STATE_ESTABLISHED = "ESTABLISHED";

// BGP uses IPv4 protocol number 179 for its own transport, but in this simulation
// we route BGP messages directly node-to-node via a simplified call rather than
// TCP sockets. Sessions are identified by the peer node reference.

export default class BGP {
    parent      // The BGPRouter that owns this instance
    asn
    sessions    // Map<peer_id, session>

    constructor(parent_router) {
        this.parent = parent_router;
        this.asn = parent_router.asn;
        this.sessions = new Map();

        this.receive = this.receive.bind(this);
        this.init = this.init.bind(this);
        this._keepalive_tick = this._keepalive_tick.bind(this);
    }

    init() {
        // Register BGP as an IPv4 application on protocol 179.
        this.parent.ip.register_protocol(179, this.receive);
    }

    // Pre-register a peer session so incoming OPENs can be handled before
    // open_session() fires (avoids timing race on simultaneous startup).
    pre_register_peer(peer_id, peer_router, port_idx) {
        if (!this.sessions.has(peer_id)) {
            this.sessions.set(peer_id, {
                peer: peer_router,
                port_idx: port_idx,
                state: STATE_IDLE,
                peer_asn: peer_router.asn,
            });
        }
    }

    // Called by BGPRouter.init() once for each peer BGPRouter object.
    open_session(peer_router, local_port_idx) {
        // Re-use pre-registered session if available.
        let session = this.sessions.get(peer_router.id);
        if (!session) {
            session = {
                peer: peer_router,
                port_idx: local_port_idx,
                state: STATE_IDLE,
                peer_asn: peer_router.asn,
            };
            this.sessions.set(peer_router.id, session);
        }

        if (session.state === STATE_ESTABLISHED) return; // already up

        this._send_to(peer_router, local_port_idx, MSG_OPEN, {
            asn: this.asn,
            router_id: this.parent.id,
            hold_time: Config.BGP_HOLD_TIME,
        });
        session.state = STATE_OPEN_SENT;
    }

    // Receive a BGP message from IPv4 layer.
    // data = { msg_type, payload, sender_id }
    receive(data, ip_header) {
        const session = this.sessions.get(data.sender_id);
        if (!session) {
            console.warn("BGP: no session for sender", data.sender_id, "on", this.parent.id);
            return;
        }

        switch (data.msg_type) {
            case MSG_OPEN:       this._handle_open(session, data.payload);       break;
            case MSG_UPDATE:     this._handle_update(session, data.payload);     break;
            case MSG_KEEPALIVE:  this._handle_keepalive(session);                break;
            case MSG_NOTIFICATION: this._handle_notification(session, data.payload); break;
            default:
                console.warn("BGP: unknown message type", data.msg_type);
        }
    }

    _handle_open(session, payload) {
        if (session.state === STATE_IDLE) {
            // Passive open: we received OPEN before sending ours. Reply with OPEN + KEEPALIVE.
            this._send_to(session.peer, session.port_idx, MSG_OPEN, {
                asn: this.asn,
                router_id: this.parent.id,
                hold_time: Config.BGP_HOLD_TIME,
            });
        }
        // Both IDLE (passive) and OPEN_SENT (simultaneous open) transitions: send KEEPALIVE.
        this._send_to(session.peer, session.port_idx, MSG_KEEPALIVE, {});
        session.state = STATE_ESTABLISHED;
        console.log("BGP ESTABLISHED:", this.parent.id, "<->", session.peer.id);
        this._advertise_routes(session);
        // Fast initial keepalive to confirm liveness, then switch to slow with phase spread.
        setTimeout(() => this._schedule_keepalive(session, Config.BGP_KEEPALIVE_SLOW, true),
                   Config.BGP_KEEPALIVE_INTERVAL * Config.sim.time_factor);
    }

    _handle_keepalive(session) {
        if (session.state === STATE_OPEN_SENT) {
            // KEEPALIVE completes the session establishment from our side
            session.state = STATE_ESTABLISHED;
            console.log("BGP ESTABLISHED:", this.parent.id, "<->", session.peer.id);
            this._advertise_routes(session);
            setTimeout(() => this._schedule_keepalive(session, Config.BGP_KEEPALIVE_SLOW, true),
                       Config.BGP_KEEPALIVE_INTERVAL * Config.sim.time_factor);
        }
        // Refresh hold timer (not modelled explicitly in this simulation)
    }

    _handle_update(session, payload) {
        // Install received prefixes into our routing table.
        if (payload.nlri) {
            for (const prefix of payload.nlri) {
                const next_hop = payload.path_attrs.next_hop;
                console.log("BGP: installing route", prefix, "via", next_hop,
                            "from", session.peer.id, "on", this.parent.id);
                this.parent.ip.routing_table.add_route(prefix, next_hop, session.port_idx);
            }
        }
        // Remove withdrawn routes
        if (payload.withdrawn) {
            for (const prefix of payload.withdrawn) {
                this.parent.ip.routing_table.remove_route(prefix);
            }
        }
    }

    _handle_notification(session, payload) {
        console.warn("BGP NOTIFICATION from", session.peer.id,
                     "code", payload.error_code, "subcode", payload.error_subcode);
        session.state = STATE_IDLE;
    }

    // Advertise the local ASN's prefix to a peer.
    _advertise_routes(session) {
        // Announce the whole ASN supernet (/16 covers all L3-router subnets within this ASN).
        const our_prefix = `10.${this.asn}.0.0/16`;
        // next_hop is our local peering IP on the shared peering link
        const our_peering_port = this.parent.ports[session.port_idx];
        const our_next_hop = our_peering_port
            ? our_peering_port.get_l3addr_witout_subnet(0)
            : this.parent.id;

        this._send_to(session.peer, session.port_idx, MSG_UPDATE, {
            withdrawn: [],
            path_attrs: {
                as_path: [this.asn],
                next_hop: our_next_hop,
            },
            nlri: [our_prefix],
        });
    }

    _schedule_keepalive(session, interval, phase_spread = false) {
        const delay = phase_spread
            // One-time phase spread: raw wall-clock ms, not scaled by time_factor.
            // This fires after the fast startup phase and distributes all sessions
            // randomly across the first slow interval so they never fire in sync.
            ? Math.random() * interval
            // Ongoing: ±50 % jitter so sessions never re-synchronise.
            : (0.5 + Math.random()) * interval * Config.sim.time_factor;
        setTimeout(this._keepalive_tick.bind(this, session), delay);
    }

    _keepalive_tick(session) {
        if (session.state !== STATE_ESTABLISHED) return;
        this._send_to(session.peer, session.port_idx, MSG_KEEPALIVE, {});
        this._schedule_keepalive(session, Config.BGP_KEEPALIVE_SLOW);
    }

    // Deliver a BGP message to the peer. Animates a packet on the link for visualization,
    // then calls the peer's BGP instance directly after the simulated link delay.
    // (BGP messages bypass the regular IPv4/Ethernet stack — they're a direct call
    // after a simulated propagation delay, similar to how a TCP session would work.)
    _send_to(peer_router, local_port_idx, msg_type, payload) {
        const msg_data = { msg_type, payload, sender_id: this.parent.id };

        const port = this.parent.ports[local_port_idx];
        const delay = port ? port.speed : 0;

        // Animate the packet on the link without going through receive_packet.
        if (port && port.link) {
            this.parent.renderer.anim_packet(port.link.id, Config.BGP_COLOR, delay, port.reversed);
        }

        // Deliver to peer BGP instance after the link propagation delay.
        setTimeout(() => {
            if (peer_router.bgp) {
                peer_router.bgp.receive(msg_data, { src: this.parent.id, dst: peer_router.id });
            }
        }, delay);
    }
}
