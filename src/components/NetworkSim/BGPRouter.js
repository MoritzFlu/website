import Router from './Router';
import BGP from './BGP';
import * as Config from './config';

// BGP border router: a Router with a BGP protocol instance.
// Peers and their port indices are registered during network construction
// via register_peer(), then sessions are opened in init().
export default class BGPRouter extends Router {
    type = "bgp-router"
    asn
    bgp
    // List of {peer_router, local_port_idx} registered before init()
    _peers = []

    constructor(id, renderer, asn) {
        super(id, renderer);
        this.asn = asn;
        this.bgp = new BGP(this);
        this.rip = null;  // BGP handles inter-ASN routing; RIP not used
    }

    // Called by Network.js after creating each inter-ASN peering link.
    register_peer(peer_router, local_port_idx) {
        this._peers.push({ peer_router, local_port_idx });
        // Pre-register so incoming OPENs are accepted even before our own open_session() fires.
        this.bgp.pre_register_peer(peer_router.id, peer_router, local_port_idx);
    }

    init() {
        super.init();
        this.bgp.init();

        // Open a BGP session with each registered peer after a small startup delay.
        // Stagger sessions to avoid simultaneous OPEN collisions.
        this._peers.forEach(({ peer_router, local_port_idx }, i) => {
            setTimeout(() => {
                this.bgp.open_session(peer_router, local_port_idx);
            }, i * 200 * Config.sim.time_factor);
        });
    }
}
