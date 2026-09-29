import HelloPage from '../components/HelloPage';
import UploadField from '../../components/UploadField';
import React, { useState } from 'react'

const Marking = () => {
    const [weightSlip, setWeightSlip] = useState(null);

    return (
        <>
            <HelloPage title="Mark Daily Attendance" source="Marking.jsx" />

            <UploadField
                label="Weight Slip"
                required
                value={weightSlip}
                onChange={setWeightSlip}
                accept="image/*,.pdf"
                maxSize={5 * 1024 * 1024}
                helperText="Upload JPG, PNG or PDF up to 5 MB."
            />
        </>
    )
}

export default Marking