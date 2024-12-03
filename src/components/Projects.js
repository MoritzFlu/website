import { Box } from "@mui/material";
import { Typography}  from "@mui/material";

import PublicationItem from "./PublicationItem";
import publicationDict from "../data/Publications";

function Projects() {
    return (
        <Box sx={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          padding: "20px 0 0"
        }}>
              <Typography
              variant="h6"
              noWrap
              component="a"
              sx={{
                display: { md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 500,
                color: 'primary.light'
              }}
            >
              Projects
            </Typography>
            {Object.keys(publicationDict).map((key,i) => (
              <PublicationItem item={publicationDict[key]}></PublicationItem>
            ))}
            </Box>
      )
}

export default Projects;