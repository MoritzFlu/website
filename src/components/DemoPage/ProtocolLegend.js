import React, { useState } from 'react';
import {
    Box, List, ListItemButton, ListItemText, Paper, Typography, Chip
} from '@mui/material';
import * as Config from '../NetworkSim/config';

const PROTOCOLS = [
    {
        id: 'stp',
        label: 'STP',
        colors: [Config.BPDU_COLOR],
        colorLabels: ['BPDU'],
        description:
            'Spanning Tree Protocol prevents Layer-2 loops by electing a root bridge and blocking ' +
            'redundant links. Watch the golden-glowing root bridge and the red blocked-port markers on links.',
    },
    {
        id: 'arp',
        label: 'ARP',
        colors: [Config.ARP_COLOR],
        colorLabels: ['ARP'],
        description:
            'Address Resolution Protocol maps IP addresses to MAC addresses before a packet can be ' +
            'sent on a local subnet. Click any host to see its current ARP table.',
    },
    {
        id: 'routing',
        label: 'Routing',
        colors: [Config.BGP_COLOR, Config.RIP_COLOR],
        colorLabels: ['BGP', 'RIP'],
        description:
            'BGP (orange) exchanges reachability between autonomous systems. ' +
            'RIP (green) distributes routes within each ASN. ' +
            'Highlighted (cyan) nodes are L3 routers. Click one to see its routing table.',
    },
    {
        id: 'dns',
        label: 'DNS',
        colors: [Config.DNS_ROOT_COLOR, Config.DNS_ASN_COLOR, Config.DNS_LOCAL_COLOR],
        colorLabels: ['Root', 'ASN', 'Local'],
        description:
            'Iterative DNS resolution: client queries the root nameserver → ASN nameserver → local ' +
            'subnet DNS. Packet colour shows which tier is being queried. ' +
            'Click a DNS node (cyan) to see its zone records.',
    },
    {
        id: 'tcp',
        label: 'TCP / HTTP',
        colors: [Config.TCP_COLOR, Config.HTTP_COLOR],
        colorLabels: ['TCP', 'HTTP'],
        description:
            'TCP (blue) provides reliable delivery via a 3-way handshake and sliding-window ACKs. ' +
            'HTTP (amber) rides on top to carry GET requests and chunked responses. ' +
            'Clients and servers are highlighted (cyan). Click a server to see its hostname.',
    },
];

export default function ProtocolLegend({ activeMode, onModeChange }) {
    const [hovered, setHovered] = useState(null);
    const active = PROTOCOLS.find(p => p.id === activeMode);
    const preview = hovered ? PROTOCOLS.find(p => p.id === hovered) : null;
    const descProto = preview || active;

    return (
        <Paper elevation={2} sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
                Protocol Legend
            </Typography>

            <List dense disablePadding>
                <ListItemButton
                    selected={activeMode === 'none'}
                    onClick={() => onModeChange('none')}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                >
                    <ListItemText
                        primary={<Typography variant="body2" color="text.secondary">All traffic</Typography>}
                    />
                </ListItemButton>

                {PROTOCOLS.map(p => (
                    <ListItemButton
                        key={p.id}
                        selected={activeMode === p.id}
                        onClick={() => onModeChange(activeMode === p.id ? 'none' : p.id)}
                        onMouseEnter={() => setHovered(p.id)}
                        onMouseLeave={() => setHovered(null)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {p.colors.map((c, i) => (
                                    <Box
                                        key={i}
                                        title={p.colorLabels[i]}
                                        sx={{
                                            width: 12, height: 12,
                                            borderRadius: '50%',
                                            bgcolor: c,
                                            border: '1px solid rgba(255,255,255,0.25)',
                                            flexShrink: 0,
                                        }}
                                    />
                                ))}
                            </Box>
                            <Typography variant="body2">{p.label}</Typography>
                        </Box>
                        {p.colors.length > 1 && (
                            <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
                                {p.colorLabels.map((l, i) => (
                                    <Chip
                                        key={i}
                                        label={l}
                                        size="small"
                                        sx={{
                                            height: 14, fontSize: 9,
                                            bgcolor: p.colors[i],
                                            color: _contrast(p.colors[i]),
                                            '& .MuiChip-label': { px: 0.5 },
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                    </ListItemButton>
                ))}
            </List>

            {descProto && (
                <Paper
                    variant="outlined"
                    sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.04)' }}
                >
                    <Typography variant="caption" component="p" sx={{ lineHeight: 1.5 }}>
                        {descProto.description}
                    </Typography>
                </Paper>
            )}
        </Paper>
    );
}

function _contrast(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000' : '#fff';
}
