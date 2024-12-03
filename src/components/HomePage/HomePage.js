import { Container } from '@mui/material';
import Box from '@mui/material/Box';
import Flex from '@react-css/flex'
import Publications from '../Publications';
import About from '../About';
import Projects from '../Projects';
import { Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';


import Network from '../NetworkSim/Network';
import NavBar from '../Navbar';

function HomePage() {
    return (
        <div>
            <NavBar></NavBar>
            <Container maxWidth="xl">
                <Flex>
                    <Box sx={{
                        display: { md: 'flex' }
                    }}>
                        <Publications></Publications>
                    </Box>
                    <Box sx={{
                        flexGrow: 3,
                        height: 90 + "vh",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        display: { md: 'flex' }
                    }}>
                        <Box sx={{
                            display: { md: 'flex' }
                        }}>
                            <Typography
                                variant="h7"
                                component="a"
                                sx={{
                                    mr: 2,
                                    display: { xs: 'none', md: 'flex' },
                                    color: 'primary.light',
                                    textDecoration: 'none',
                                }}
                            >
                                This network simulation is running live in your browser!
                            </Typography>
                        </Box>
                        <Typography
                                variant="p"
                                component="p"
                                sx={{
                                    mr: 2,
                                    display: { xs: 'none', md: 'flex' },
                                    color: 'primary.light',
                                    textDecoration: 'none',
                                    fontSize: 8
                                }}
                            >
                                (Refresh the page for a new network!)
                            </Typography>
                        <KeyboardArrowDownIcon sx={{
                            color: 'primary.light'
                        }}></KeyboardArrowDownIcon>
                        <Box sx={{
                            border: "2px solid",
                            flexGrow: 1,
                            borderRadius: 5 + "px",
                            borderColor: "primary.light",
                            padding: "5px",
                            margin: "0 50px 0",
                            alignSelf: "stretch",
                            maxHeight: "80%",
                            boxShadow: "0 0 4px white",
                            display: { md: 'flex' }
                        }}>
                            <Network />
                        </Box>

                    </Box>
                    <Box sx={{
                        display: { md: 'flex' }
                    }}
                    >
                        <Projects></Projects>
                    </Box>
                </Flex>
            </Container>
        </div>
    )
}

export default HomePage;