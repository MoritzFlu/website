import React, { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';

import NavBar from '../Navbar';
import Network from '../NetworkSim/Network';
import ProtocolLegend from './ProtocolLegend';
import NodeInfoPanel from './NodeInfoPanel';
import * as SimMode from '../NetworkSim/SimMode';

export default function DemoPage() {
    const [mode, setMode] = useState('none');
    const [nodeInfo, setNodeInfo] = useState(null);

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

    return (
        <div>
            <NavBar />
            <Container maxWidth="xl" disableGutters sx={{ px: 2 }}>
                <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', gap: 2, pt: 1, pb: 1 }}>

                    {/* Network visualization */}
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        minWidth: 0,
                    }}>
                        <Typography
                            variant="body2"
                            sx={{ color: 'primary.light', fontSize: 13 }}
                        >
                            This network simulation is running live in your browser!
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: 'primary.light', fontSize: 9, mb: 0.5 }}
                        >
                            (Refresh the page for a new network — click nodes to inspect their state)
                        </Typography>
                        <Box sx={{
                            border: '2px solid',
                            borderColor: 'primary.light',
                            borderRadius: '5px',
                            padding: '5px',
                            alignSelf: 'stretch',
                            flex: 1,
                            boxShadow: '0 0 4px white',
                            overflow: 'hidden',
                            minHeight: 0,
                        }}>
                            <Network onNodeClick={setNodeInfo} />
                        </Box>
                    </Box>

                    {/* Right sidebar */}
                    <Box sx={{
                        width: 280,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        pt: 1,
                        overflow: 'hidden',
                        flexShrink: 0,
                    }}>
                        <ProtocolLegend activeMode={mode} onModeChange={handleModeChange} />
                        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                            <NodeInfoPanel info={nodeInfo} mode={mode} />
                        </Box>
                    </Box>

                </Box>
            </Container>
        </div>
    );
}
