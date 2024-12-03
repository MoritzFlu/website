import { Box } from "@mui/material";
import { Typography } from "@mui/material";

import MenuBookIcon from '@mui/icons-material/MenuBook';
import BuildIcon from '@mui/icons-material/Build';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

function PublicationItem(props) {

    return (
        <Box sx={{
            border: 1,
            borderColor: "primary.main",
            borderRadius: "2px",
            padding: "10px",
            margin: "5px",
            width: "100%",
            display: "flex",
            alignItems: "center",
            "&:hover": {
                backgroundColor: "primary.light"
            }
        }}>
            {props.item["type"] == "journal" &&
                <MenuBookIcon color="primary"></MenuBookIcon>
            }
            {props.item["type"] == "workshop" &&
                <BuildIcon color="primary"></BuildIcon>
            }
            {props.item["type"] == "conference" &&
                <CoPresentIcon color="primary"></CoPresentIcon>
            }
            {props.item["type"] == "preprint" &&
                <HourglassTopIcon color="primary"></HourglassTopIcon>
            }
            <Typography
                variant="p"
                component="a"
                sx={{
                    fontFamily: 'monospace',
                    color: 'primary.contrastText',
                    margin: "0 0 0 10px"
                }}
            >
                {props.item["short"]}
            </Typography>
            </Box>
    )
}

export default PublicationItem;