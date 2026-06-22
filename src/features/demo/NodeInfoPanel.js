import React from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableRow, TableCell,
    TableHead, Chip
} from '@mui/material';

export default function NodeInfoPanel({ info }) {
    if (!info) {
        return (
            <Paper elevation={2} sx={{ p: 1.5, flex: 1 }}>
                <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
                    Node Info
                </Typography>
                <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 1 }}>
                    Click a node in the simulation to inspect its state.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={2} sx={{ p: 1.5, flex: 1, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
                    {info.type}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {info.id}
                </Typography>
            </Box>

            {info.type === 'switch' && <SwitchInfo info={info} />}
            {(info.type === 'router' || info.type === 'bgp-router') && <RouterInfo info={info} />}
            {(info.type === 'dns-root' || info.type === 'dns-asn' || info.type === 'dns-local') && <DnsNodeInfo info={info} />}
            {info.type === 'client' && <ClientInfo info={info} />}
            {info.type === 'server' && <ServerInfo info={info} />}
        </Paper>
    );
}

function SwitchInfo({ info }) {
    const { stp } = info;
    return (
        <>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {stp.is_root && <Chip label="Root Bridge" size="small" color="warning" />}
                <Typography variant="caption" color="text.secondary">
                    Bridge: {stp.bridge_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Root: {stp.root_id}
                </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Ports</Typography>
            <Table size="small" sx={{ mt: 0.5 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={thSx}>Port</TableCell>
                        <TableCell sx={thSx}>State</TableCell>
                        <TableCell sx={thSx}>Cost</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {stp.ports.map(p => (
                        <TableRow key={p.port}>
                            <TableCell sx={tdSx}>{p.port}</TableCell>
                            <TableCell sx={tdSx}>
                                <Chip
                                    label={p.state}
                                    size="small"
                                    sx={{ height: 16, fontSize: 10,
                                        bgcolor: p.state === 'NDP' ? '#FF2222'
                                               : p.state === 'RP'  ? '#FFD700' : '#4CAF50',
                                        color: '#000',
                                        '& .MuiChip-label': { px: 0.5 },
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={tdSx}>{p.cost}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Forwarding Table</Typography>
                <ForwardingTable entries={info.forwarding_table} />
            </Box>
        </>
    );
}

function RouterInfo({ info }) {
    return (
        <>
            <Typography variant="caption" color="text.secondary">Routing Table</Typography>
            <RoutingTable routes={info.routing_table} />
        </>
    );
}

function DnsNodeInfo({ info }) {
    return (
        <>
            <Typography variant="caption" color="text.secondary">DNS Zones</Typography>
            <Table size="small" sx={{ mt: 0.5 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={thSx}>Name</TableCell>
                        <TableCell sx={thSx}>IP</TableCell>
                        <TableCell sx={thSx}>Type</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(info.dns_zones ?? []).map((z, i) => (
                        <TableRow key={i}>
                            <TableCell sx={{ ...tdSx, wordBreak: 'break-all' }}>{z.name}</TableCell>
                            <TableCell sx={tdSx}>{z.ip}</TableCell>
                            <TableCell sx={tdSx}>
                                <Chip
                                    label={z.is_ns ? 'NS' : 'A'}
                                    size="small"
                                    sx={{ height: 16, fontSize: 10,
                                        bgcolor: z.is_ns ? '#FF8800' : '#44AAFF', color: '#000',
                                        '& .MuiChip-label': { px: 0.5 },
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}

function ClientInfo({ info }) {
    const entries = Object.entries(info.arp_table);
    return (
        <>
            <HostInterfaceInfo info={info} />
            <Typography variant="caption" color="text.secondary">ARP Table</Typography>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary" component="p">
                    (empty — no entries resolved yet)
                </Typography>
            ) : (
                <Table size="small" sx={{ mt: 0.5 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thSx}>IP</TableCell>
                            <TableCell sx={thSx}>MAC</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.map(([ip, mac]) => (
                            <TableRow key={ip}>
                                <TableCell sx={tdSx}>{ip}</TableCell>
                                <TableCell sx={{ ...tdSx, fontFamily: 'monospace', fontSize: 10 }}>{mac}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </>
    );
}

function ServerInfo({ info }) {
    const entries = Object.entries(info.arp_table);
    return (
        <>
            <HostInterfaceInfo info={info} />
            {info.hostname && (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                    Hostname: <strong>{info.hostname}</strong>
                </Typography>
            )}
            <Typography variant="caption" color="text.secondary">ARP Table</Typography>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary" component="p">
                    (empty — no entries resolved yet)
                </Typography>
            ) : (
                <Table size="small" sx={{ mt: 0.5 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thSx}>IP</TableCell>
                            <TableCell sx={thSx}>MAC</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.map(([ip, mac]) => (
                            <TableRow key={ip}>
                                <TableCell sx={tdSx}>{ip}</TableCell>
                                <TableCell sx={{ ...tdSx, fontFamily: 'monospace', fontSize: 10 }}>{mac}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </>
    );
}

function HostInterfaceInfo({ info }) {
    return (
        <Box sx={{ display: 'grid', gap: 0.25, mb: 1 }}>
            {info.ip && (
                <Typography variant="caption" color="text.secondary" component="p">
                    IP: <strong>{info.ip}</strong>
                </Typography>
            )}
            {info.mac && (
                <Typography variant="caption" color="text.secondary" component="p">
                    MAC: <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 10 }}>{info.mac}</Box>
                </Typography>
            )}
        </Box>
    );
}

function ForwardingTable({ entries }) {
    if (!entries || entries.length === 0) {
        return (
            <Typography variant="caption" color="text.secondary" component="p">
                (empty — no MAC addresses learned yet)
            </Typography>
        );
    }
    return (
        <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={thSx}>MAC</TableCell>
                    <TableCell sx={thSx}>Port</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {entries.map((entry) => (
                    <TableRow key={`${entry.mac}-${entry.port}`}>
                        <TableCell sx={{ ...tdSx, fontFamily: 'monospace', fontSize: 10 }}>{entry.mac}</TableCell>
                        <TableCell sx={tdSx}>{entry.port}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function RoutingTable({ routes }) {
    if (!routes || routes.length === 0) {
        return (
            <Typography variant="caption" color="text.secondary" component="p">
                (empty)
            </Typography>
        );
    }
    return (
        <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={thSx}>Prefix</TableCell>
                    <TableCell sx={thSx}>Next Hop</TableCell>
                    <TableCell sx={thSx}>Port</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {routes.map((r, i) => (
                    <TableRow key={i}>
                        <TableCell sx={{ ...tdSx, fontFamily: 'monospace' }}>{r.prefix}</TableCell>
                        <TableCell sx={tdSx}>{r.next_hop ?? 'direct'}</TableCell>
                        <TableCell sx={tdSx}>{r.port}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

const thSx = { py: 0.25, px: 0.75, fontSize: 10, fontWeight: 700 };
const tdSx = { py: 0.25, px: 0.75, fontSize: 10 };
