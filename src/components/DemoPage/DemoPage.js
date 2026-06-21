import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';

import Network from '../NetworkSim/Network';
import ProtocolLegend from './ProtocolLegend';
import NodeInfoPanel from './NodeInfoPanel';
import * as SimMode from '../NetworkSim/SimMode';

const CONTROL_DEFS = [
    { key: 'asnCount', label: 'ASNs', floor: 2, ceiling: 4 },
    { key: 'routersPerAsn', label: 'Subnets / AS', floor: 1, ceiling: 4 },
    { key: 'switchesPerSubnet', label: 'Switches', floor: 1, ceiling: 5 },
    { key: 'serversPerSubnet', label: 'Servers', floor: 1, ceiling: 3 },
    { key: 'clientsPerSubnet', label: 'Clients', floor: 1, ceiling: 4 },
];

const DEFAULT_RANGES = {
    asnCount: { min: 4, max: 4 },
    routersPerAsn: { min: 4, max: 4 },
    switchesPerSubnet: { min: 4, max: 4 },
    serversPerSubnet: { min: 3, max: 3 },
    clientsPerSubnet: { min: 4, max: 4 },
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeRange(range, def) {
    const parsedMin = Number.isFinite(Number(range.min)) ? Number(range.min) : def.floor;
    const parsedMax = Number.isFinite(Number(range.max)) ? Number(range.max) : def.ceiling;
    const low = clamp(Math.round(parsedMin), def.floor, def.ceiling);
    const high = clamp(Math.round(parsedMax), def.floor, def.ceiling);
    return { min: Math.min(low, high), max: Math.max(low, high) };
}

function normalizeRanges(ranges) {
    return CONTROL_DEFS.reduce((next, def) => {
        next[def.key] = normalizeRange(ranges[def.key], def);
        return next;
    }, {});
}

function randRange({ min, max }) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function DemoPage() {
    const [mode, setMode] = useState('none');
    const [nodeInfo, setNodeInfo] = useState(null);
    const [ranges, setRanges] = useState(DEFAULT_RANGES);
    const [activeConfig, setActiveConfig] = useState(() => {
        const normalized = normalizeRanges(DEFAULT_RANGES);
        return { asnCount: normalized.asnCount.max, ranges: normalized };
    });
    const [networkKey, setNetworkKey] = useState(0);

    // Reset mode whenever the demo page mounts
    useEffect(() => {
        SimMode.setMode('none');
        return () => SimMode.setMode('none');
    }, []);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        SimMode.setMode(newMode);
        setNodeInfo(null);
    };

    const limits = useMemo(() => ({
        minRoutersPerAsn: activeConfig.ranges.routersPerAsn.min,
        maxRoutersPerAsn: activeConfig.ranges.routersPerAsn.max,
        minSwitchesPerSubnet: activeConfig.ranges.switchesPerSubnet.min,
        maxSwitchesPerSubnet: activeConfig.ranges.switchesPerSubnet.max,
        minServersPerSubnet: activeConfig.ranges.serversPerSubnet.min,
        maxServersPerSubnet: activeConfig.ranges.serversPerSubnet.max,
        minClientsPerSubnet: activeConfig.ranges.clientsPerSubnet.min,
        maxClientsPerSubnet: activeConfig.ranges.clientsPerSubnet.max,
    }), [activeConfig]);

    const layout = useMemo(() => ({
        asnRadius: activeConfig.asnCount <= 2 ? 360 : 390,
        subnetRadius: activeConfig.ranges.routersPerAsn.max <= 2 ? 190 : 220,
    }), [activeConfig]);

    const nodeRange = useMemo(() => {
        const countNodes = (side) =>
            activeConfig.ranges.asnCount[side] *
            (2 + activeConfig.ranges.routersPerAsn[side] * (
                activeConfig.ranges.switchesPerSubnet[side] +
                activeConfig.ranges.serversPerSubnet[side] +
                activeConfig.ranges.clientsPerSubnet[side] +
                2
            )) + 1;

        return { min: countNodes('min'), max: countNodes('max') };
    }, [activeConfig]);

    const handleRangeChange = (key, bound) => (event) => {
        const value = event.target.value;
        setRanges((current) => ({
            ...current,
            [key]: {
                ...current[key],
                [bound]: value === '' ? '' : Number(value),
            },
        }));
    };

    const regenerateNetwork = () => {
        const normalized = normalizeRanges(ranges);
        setRanges(normalized);
        setActiveConfig({
            asnCount: randRange(normalized.asnCount),
            ranges: normalized,
        });
        setNodeInfo(null);
        setNetworkKey((current) => current + 1);
    };

    const nodeRangeLabel = nodeRange.min === nodeRange.max
        ? nodeRange.max
        : `${nodeRange.min}-${nodeRange.max}`;

    return (
        <main className="site-shell sim-shell">
            <header className="site-header sim-header">
                <Link className="brand-mark" to="/" aria-label="Moritz Flüchter homepage">
                    <span className="brand-dot" />
                    <span className="brand-full">moritz flüchter</span>
                    <span className="brand-short">m flüchter</span>
                </Link>
                <nav className="top-nav" aria-label="Simulator navigation">
                    <Link to="/">Home</Link>
                    <a href="#controls">Configure</a>
                    <a href="#inspect">Inspect</a>
                </nav>
                <Link className="mobile-sim-link" to="/">
                    home
                </Link>
            </header>

            <section className="sim-intro">
                <div>
                    <div className="eyebrow">Live network simulator</div>
                    <h1>Build a topology, watch packets fly.</h1>
                    <p>
                        Configure the number of nodes for the network, regenerate it in place, and click nodes
                        to inspect protocol state while traffic is running. Fullscreen recommended!
                    </p>
                </div>
                <div className="sim-stat">
                    <span>{nodeRangeLabel}</span>
                    <small>nodes</small>
                </div>
            </section>

            <section className="sim-workspace">
                <aside className="sim-controls" id="controls" aria-label="Network generator controls">
                    <div className="section-heading">
                        <span>Configure</span>
                        <i />
                    </div>
                    <div className="sim-control-list">
                        {CONTROL_DEFS.map((control) => (
                            <fieldset className="sim-control" key={control.key}>
                                <legend>
                                    <b>{control.label}</b>
                                    <em>{control.floor}-{control.ceiling}</em>
                                </legend>
                                <div className="sim-range-inputs">
                                    <label>
                                        <span>min</span>
                                        <input
                                            type="number"
                                            min={control.floor}
                                            max={control.ceiling}
                                            step="1"
                                            value={ranges[control.key].min}
                                            onChange={handleRangeChange(control.key, 'min')}
                                            aria-label={`${control.label} minimum`}
                                        />
                                    </label>
                                    <label>
                                        <span>max</span>
                                        <input
                                            type="number"
                                            min={control.floor}
                                            max={control.ceiling}
                                            step="1"
                                            value={ranges[control.key].max}
                                            onChange={handleRangeChange(control.key, 'max')}
                                            aria-label={`${control.label} maximum`}
                                        />
                                    </label>
                                </div>
                            </fieldset>
                        ))}
                    </div>
                    <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={regenerateNetwork}
                        fullWidth
                        className="sim-regenerate"
                    >
                        Regenerate network
                    </Button>
                </aside>

                <div className="sim-main">
                    <div className="sim-toolbar">
                        <div className="live-badge" aria-label="Live simulator status">
                            <b />
                            live
                        </div>
                        <div className="sim-toolbar-copy">
                            <TuneIcon fontSize="small" />
                            <span>Click nodes to inspect protocol state</span>
                        </div>
                    </div>
                    <div className="sim-canvas" aria-label="Live generated network simulation">
                        <Network
                            key={networkKey}
                            onNodeClick={setNodeInfo}
                            asnCount={activeConfig.asnCount}
                            limits={limits}
                            layout={layout}
                        />
                    </div>
                </div>

                <aside className="sim-inspector" id="inspect">
                    <ProtocolLegend activeMode={mode} onModeChange={handleModeChange} />
                    <div className="sim-node-panel">
                        <NodeInfoPanel info={nodeInfo} mode={mode} />
                    </div>
                </aside>
            </section>
        </main>
    );
}
