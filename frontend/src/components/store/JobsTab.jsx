import React, { memo } from "react";
import { Box } from "@mui/material";
import JobCardRow from "../JobCardRow";

const JobsTab = memo(function JobsTab({ jobs = [], onSelectJob }) {
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}>
        {jobs.map((job) => (
          <JobCardRow key={job._id} job={job} onClick={() => onSelectJob(job)} />
        ))}
      </Box>
    </Box>
  );
});

export default JobsTab;

