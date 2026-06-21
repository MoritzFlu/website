import * as Config from './config';

// Message format: { tx_id, type: "QUERY"|"REFERRAL"|"RESPONSE", qname, referral_ip?, answer? }
// IPv4 protocol number: 53

let _tx_counter = 0;

export default class DNS {
    parent
    zones = {}    // name → { ip, is_ns }
    pending = {}  // tx_id → { stage, fqdn, asn_label, sub_label, callback }

    constructor(parent) {
        this.parent = parent;
        this.receive = this.receive.bind(this);
    }

    // Register an A record (terminal answer for a full FQDN)
    register_zone(fqdn, ip) {
        this.zones[fqdn] = { ip, is_ns: false };
    }

    // Register a nameserver referral (label → next-tier DNS IP)
    register_ns(label, ns_ip) {
        this.zones[label] = { ip: ns_ip, is_ns: true };
    }

    // Client-side: iterative 3-step resolution of a full FQDN
    // fqdn format: "hostname.sub-R.asn-A"   e.g. "cake.sub-1.asn-0"
    query(fqdn, root_dns_ip, callback) {
        const parts = fqdn.split('.');
        // parts = ["cake", "sub-1", "asn-0"]
        const asn_label = parts[parts.length - 1];                     // "asn-0"
        const sub_label = parts.slice(parts.length - 2).join('.');     // "sub-1.asn-0"

        const tx_id = ++_tx_counter;
        this.pending[tx_id] = { stage: 'asn', fqdn, asn_label, sub_label, callback };

        this._send(root_dns_ip, { tx_id, type: 'QUERY', qname: asn_label }, Config.DNS_ROOT_COLOR);
    }

    receive(data, src_ip, _src_port) {
        if (data.type === 'QUERY') {
            this._handle_query(data, src_ip);
        } else {
            this._handle_response(data);
        }
    }

    _handle_query(msg, src_ip) {
        const record = this.zones[msg.qname];
        if (!record) {
            console.warn(`DNS [${this.parent.id}] no record for "${msg.qname}"`);
            return;
        }
        const reply_color = this.parent.type === 'dns-root'  ? Config.DNS_ROOT_COLOR
                          : this.parent.type === 'dns-asn'   ? Config.DNS_ASN_COLOR
                          : this.parent.type === 'dns-local'  ? Config.DNS_LOCAL_COLOR
                          : Config.DNS_COLOR;
        if (record.is_ns) {
            this._send(src_ip, { tx_id: msg.tx_id, type: 'REFERRAL', qname: msg.qname, referral_ip: record.ip }, reply_color);
        } else {
            this._send(src_ip, { tx_id: msg.tx_id, type: 'RESPONSE', qname: msg.qname, answer: record.ip }, reply_color);
        }
    }

    _handle_response(msg) {
        const state = this.pending[msg.tx_id];
        if (!state) return;

        if (msg.type === 'REFERRAL') {
            if (state.stage === 'asn') {
                // Got ASN NS → query it for the subnet NS
                const new_tx = ++_tx_counter;
                this.pending[new_tx] = { ...state, stage: 'subnet' };
                delete this.pending[msg.tx_id];
                this._send(msg.referral_ip, { tx_id: new_tx, type: 'QUERY', qname: state.sub_label }, Config.DNS_ASN_COLOR);
            } else if (state.stage === 'subnet') {
                // Got subnet NS → query it for the host A record
                const new_tx = ++_tx_counter;
                this.pending[new_tx] = { ...state, stage: 'host' };
                delete this.pending[msg.tx_id];
                this._send(msg.referral_ip, { tx_id: new_tx, type: 'QUERY', qname: state.fqdn }, Config.DNS_LOCAL_COLOR);
            }
        } else if (msg.type === 'RESPONSE') {
            delete this.pending[msg.tx_id];
            state.callback(msg.answer);
        }
    }

    _send(dst_ip, msg, color = Config.DNS_COLOR) {
        this.parent.udp.send(msg, dst_ip, 53, 53, color);
    }
}
