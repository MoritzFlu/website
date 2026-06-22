import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Drawer } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import LayersIcon from '@mui/icons-material/Layers';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

import Network from '../network-sim/Network';
import ProtocolLegend from './ProtocolLegend';
import NodeInfoPanel from './NodeInfoPanel';
import * as SimMode from '../network-sim/helpers/SimMode';

// Topology controls — committed on "Regenerate network" (each rebuilds the graph).
const TOPOLOGY_DEFS = [
    { key: 'asnCount',          label: 'ASNs',              floor: 1, ceiling: 4 },
    { key: 'routersPerAsn',     label: 'Subnets / AS',      floor: 1, ceiling: 4 },
    { key: 'switchesPerSubnet', label: 'Switches / subnet', floor: 1, ceiling: 6 },
    { key: 'serversPerSubnet',  label: 'Servers / subnet',  floor: 1, ceiling: 4 },
    { key: 'clientsPerSubnet',  label: 'Clients / subnet',  floor: 1, ceiling: 5 },
];

// Traffic controls — applied live, no regenerate needed.
const RATE_DEFS = [
    { key: 'speed',             label: 'Speed',         floor: 0.25, ceiling: 4,  step: 0.25, suffix: '×' },
    { key: 'requestsPerSecond', label: 'Requests / s',  floor: 1,    ceiling: 20, step: 1 },
];

const DEFAULT_TOPOLOGY = {
    asnCount: 3,
    routersPerAsn: 2,
    switchesPerSubnet: 3,
    serversPerSubnet: 2,
    clientsPerSubnet: 3,
};

const DEFAULT_RATES = {
    speed: 1,
    requestsPerSecond: 1,
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeTopology(topology) {
    return TOPOLOGY_DEFS.reduce((next, def) => {
        const parsed = Number(topology[def.key]);
        next[def.key] = Number.isFinite(parsed)
            ? clamp(Math.round(parsed), def.floor, def.ceiling)
            : def.floor;
        return next;
    }, {});
}

function normalizeRate(value, def) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return def.floor;
    const rounded = def.step >= 1 ? Math.round(parsed) : parsed;
    return clamp(rounded, def.floor, def.ceiling);
}

function isMobileViewport(element = null) {
    if (typeof window === 'undefined') return false;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const elementWidth = element?.getBoundingClientRect?.().width ?? Infinity;
    return Math.min(viewportWidth, elementWidth) <= 760;
}

export default function DemoPage() {
    const [mode, setMode] = useState('none');
    const [nodeInfo, setNodeInfo] = useState(null);
    const [isMobile, setIsMobile] = useState(isMobileViewport);
    const [legendOpen, setLegendOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const shellRef = useRef(null);
    const simMainRef = useRef(null);
    const canvasRef = useRef(null);
    const panRef = useRef(null);
    const suppressClickRef = useRef(false);

    const [topology, setTopology] = useState(DEFAULT_TOPOLOGY);
    const [activeTopology, setActiveTopology] = useState(() => normalizeTopology(DEFAULT_TOPOLOGY));
    const [rates, setRates] = useState(DEFAULT_RATES);
    const [networkKey, setNetworkKey] = useState(0);

    const clampPanOffset = useCallback((offset, nextZoom = zoom) => {
        const canvas = canvasRef.current;
        if (!canvas || nextZoom <= 1) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const overflowX = Math.max(0, (rect.width * nextZoom - rect.width) / 2);
        const overflowY = Math.max(0, (rect.height * nextZoom - rect.height) / 2);

        return {
            x: clamp(offset.x, -overflowX, overflowX),
            y: clamp(offset.y, -overflowY, overflowY),
        };
    }, [zoom]);

    // Reset mode whenever the demo page mounts
    useEffect(() => {
        SimMode.setMode('none');
        return () => SimMode.setMode('none');
    }, []);

    useEffect(() => {
        const handleChange = () => {
            setIsMobile(isMobileViewport(shellRef.current));
            setNodeInfo(null);
            setPanOffset((current) => clampPanOffset(current));
        };

        handleChange();
        window.addEventListener('resize', handleChange);
        window.visualViewport?.addEventListener('resize', handleChange);

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(handleChange)
            : null;
        if (observer && shellRef.current) observer.observe(shellRef.current);

        return () => {
            window.removeEventListener('resize', handleChange);
            window.visualViewport?.removeEventListener('resize', handleChange);
            if (observer) observer.disconnect();
        };
    }, [clampPanOffset]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === simMainRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        SimMode.setMode(newMode);
        setNodeInfo(null);
    };

    const handleNodeClick = (info) => {
        setNodeInfo(info);
        if (info && isMobile) setLegendOpen(false);
    };

    const limits = useMemo(() => ({
        minRoutersPerAsn: activeTopology.routersPerAsn,
        maxRoutersPerAsn: activeTopology.routersPerAsn,
        minSwitchesPerSubnet: activeTopology.switchesPerSubnet,
        maxSwitchesPerSubnet: activeTopology.switchesPerSubnet,
        minServersPerSubnet: activeTopology.serversPerSubnet,
        maxServersPerSubnet: activeTopology.serversPerSubnet,
        minClientsPerSubnet: activeTopology.clientsPerSubnet,
        maxClientsPerSubnet: activeTopology.clientsPerSubnet,
    }), [activeTopology]);

    const layout = useMemo(() => ({
        asnRadius: isMobile ? 240 : activeTopology.asnCount <= 2 ? 360 : 390,
        subnetRadius: isMobile ? 150 : activeTopology.routersPerAsn <= 2 ? 190 : 220,
        orientation: isMobile ? 'vertical' : 'horizontal',
    }), [activeTopology, isMobile]);

    const nodeCount = useMemo(() => {
        const t = activeTopology;
        return t.asnCount * (2 + t.routersPerAsn * (
            t.switchesPerSubnet + t.serversPerSubnet + t.clientsPerSubnet + 2
        )) + 1;
    }, [activeTopology]);

    // Live traffic props derived from the rate controls.
    const speed = normalizeRate(rates.speed, RATE_DEFS[0]);
    const requestsPerSecond = normalizeRate(rates.requestsPerSecond, RATE_DEFS[1]);
    const timeFactor = 1 / speed;

    const handleTopologyChange = (key) => (event) => {
        const value = event.target.value;
        setTopology((current) => ({ ...current, [key]: value === '' ? '' : Number(value) }));
    };

    const handleRateChange = (key) => (event) => {
        const value = event.target.value;
        setRates((current) => ({ ...current, [key]: value === '' ? '' : Number(value) }));
    };

    const regenerateNetwork = () => {
        const normalized = normalizeTopology(topology);
        setTopology(normalized);
        setActiveTopology(normalized);
        setNodeInfo(null);
        setNetworkKey((current) => current + 1);
    };

    const toggleFullscreen = async () => {
        const target = simMainRef.current;
        if (!target) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        if (target.requestFullscreen) {
            try {
                await target.requestFullscreen();
                return;
            } catch (error) {
                // Some mobile browsers expose the API but reject non-media fullscreen.
            }
        }

        setIsFullscreen((current) => !current);
    };

    const changeZoom = (delta) => {
        setZoom((current) => {
            const next = clamp(Math.round((current + delta) * 10) / 10, 1, 1.8);
            setPanOffset((offset) => clampPanOffset(offset, next));
            return next;
        });
    };

    const resetZoom = () => {
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
    };

    const startPan = (event) => {
        if (zoom <= 1) return;
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest('button, a, input, textarea, select, [role="button"]')) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        panRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            offsetX: panOffset.x,
            offsetY: panOffset.y,
            moved: false,
        };
    };

    const panCanvas = (event) => {
        const pan = panRef.current;
        const canvas = canvasRef.current;
        if (!pan || !canvas || pan.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - pan.x;
        const deltaY = event.clientY - pan.y;
        const moved = Math.hypot(deltaX, deltaY) > 4;
        if (!pan.moved && !moved) return;

        if (!pan.moved) {
            pan.moved = true;
            canvas.setPointerCapture?.(event.pointerId);
            canvas.classList.add('is-panning');
        }

        event.preventDefault();
        setPanOffset(clampPanOffset({
            x: pan.offsetX + deltaX,
            y: pan.offsetY + deltaY,
        }));
    };

    const endPan = (event) => {
        const wasPanning = panRef.current?.moved;
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.releasePointerCapture?.(event.pointerId);
            canvas.classList.remove('is-panning');
        }
        panRef.current = null;
        if (wasPanning) {
            suppressClickRef.current = true;
            window.setTimeout(() => {
                suppressClickRef.current = false;
            }, 0);
        }
    };

    const suppressDragClick = (event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <main className="site-shell sim-shell" ref={shellRef}>
            <header className="site-header sim-header">
                <Link className="brand-mark" to="/" aria-label="Moritz Flüchter homepage">
                    <span className="brand-dot" />
                    <span className="brand-full">moritz flüchter</span>
                    <span className="brand-short">m flüchter</span>
                </Link>
            </header>

            <section className="sim-intro">
                <div>
                    <div className="eyebrow">Live network simulator</div>
                    <h1>Generate a topology, watch packets fly.</h1>
                    <p>
                        Configure the number of nodes for the network, regenerate it in place, and click nodes
                        to inspect protocol state while traffic is running. Fullscreen recommended!
                    </p>
                </div>
                <div className="sim-stat">
                    <span>{nodeCount}</span>
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
                        {TOPOLOGY_DEFS.map((def) => (
                            <fieldset className="sim-control" key={def.key}>
                                <legend>
                                    <b>{def.label}</b>
                                    <em>{def.floor}-{def.ceiling}</em>
                                </legend>
                                <input
                                    type="number"
                                    min={def.floor}
                                    max={def.ceiling}
                                    step="1"
                                    value={topology[def.key]}
                                    onChange={handleTopologyChange(def.key)}
                                    aria-label={def.label}
                                />
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

                    <div className="section-heading sim-traffic-heading">
                        <span>Traffic</span>
                        <i />
                    </div>
                    <div className="sim-control-list">
                        {RATE_DEFS.map((def) => (
                            <fieldset className="sim-control" key={def.key}>
                                <legend>
                                    <b>{def.label}</b>
                                    <em>{def.floor}-{def.ceiling}{def.suffix ?? ''}</em>
                                </legend>
                                <input
                                    type="number"
                                    min={def.floor}
                                    max={def.ceiling}
                                    step={def.step}
                                    value={rates[def.key]}
                                    onChange={handleRateChange(def.key)}
                                    aria-label={def.label}
                                />
                            </fieldset>
                        ))}
                    </div>
                    <p className="sim-traffic-note">Speed and request rate apply instantly — no regenerate needed.</p>
                </aside>

                <div className={`sim-main${isFullscreen ? ' is-fullscreen' : ''}`} ref={simMainRef}>
                    <div className="sim-toolbar">
                        <div className="live-badge" aria-label="Live simulator status">
                            <b />
                            live
                        </div>
                        <div className="sim-toolbar-copy">
                            <TuneIcon fontSize="small" />
                            <span>Click nodes to inspect protocol state</span>
                        </div>
                        <div className="sim-view-controls" aria-label="Simulator view controls">
                            <button
                                type="button"
                                onClick={() => changeZoom(-0.1)}
                                aria-label="Zoom out"
                                title="Zoom out"
                                disabled={zoom <= 1}
                            >
                                <ZoomOutIcon fontSize="small" />
                            </button>
                            <button
                                type="button"
                                className="sim-zoom-reset"
                                onClick={resetZoom}
                                aria-label="Reset zoom"
                                title="Reset zoom"
                                disabled={zoom === 1 && panOffset.x === 0 && panOffset.y === 0}
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                type="button"
                                onClick={() => changeZoom(0.1)}
                                aria-label="Zoom in"
                                title="Zoom in"
                                disabled={zoom >= 1.8}
                            >
                                <ZoomInIcon fontSize="small" />
                            </button>
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                            </button>
                        </div>
                    </div>
                    <div
                        className="sim-canvas"
                        ref={canvasRef}
                        aria-label="Live generated network simulation"
                        onPointerDown={startPan}
                        onPointerMove={panCanvas}
                        onPointerUp={endPan}
                        onPointerCancel={endPan}
                        onPointerLeave={endPan}
                        onClickCapture={suppressDragClick}
                    >
                        <button
                            type="button"
                            className="sim-legend-toggle"
                            onClick={() => setLegendOpen((open) => !open)}
                            aria-label="Toggle protocol legend"
                            aria-expanded={legendOpen}
                        >
                            <LayersIcon fontSize="small" />
                            Legend
                        </button>

                        <div
                            className="sim-network-zoom"
                            style={{
                                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                            }}
                        >
                            <Network
                                key={`${networkKey}-${isMobile ? 'mobile' : 'desktop'}`}
                                onNodeClick={handleNodeClick}
                                asnCount={activeTopology.asnCount}
                                limits={limits}
                                layout={layout}
                                timeFactor={timeFactor}
                                requestsPerSecond={requestsPerSecond}
                            />
                        </div>

                        {legendOpen && (
                            <div
                                className="sim-legend-backdrop"
                                onClick={() => setLegendOpen(false)}
                                aria-hidden="true"
                            />
                        )}

                        <div
                            className={`sim-legend-overlay${legendOpen ? ' is-open' : ''}`}
                            aria-hidden={!legendOpen}
                        >
                            <button
                                type="button"
                                className="sim-legend-close"
                                onClick={() => setLegendOpen(false)}
                                aria-label="Close protocol legend"
                            >
                                <CloseIcon fontSize="small" />
                            </button>
                            <ProtocolLegend activeMode={mode} onModeChange={handleModeChange} />
                        </div>
                    </div>
                </div>

                {!isMobile && (
                    <aside className="sim-inspector" id="inspect">
                        <div className="sim-node-panel">
                            <NodeInfoPanel info={nodeInfo} mode={mode} />
                        </div>
                    </aside>
                )}
            </section>

            {isMobile && (
                <Drawer
                    anchor="bottom"
                    open={Boolean(nodeInfo)}
                    onClose={() => setNodeInfo(null)}
                    PaperProps={{ className: 'sim-node-sheet' }}
                >
                    <NodeInfoPanel info={nodeInfo} mode={mode} />
                </Drawer>
            )}
        </main>
    );
}
